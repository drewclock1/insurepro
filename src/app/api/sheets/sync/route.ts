import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createServiceRoleClient } from '@/lib/supabase-server'

const CRON_SECRET = process.env.CRON_SECRET

// Column mapping: sheet column letter → lead field
const DEFAULT_COLUMN_MAP: Record<string, string> = {
  A: 'first_name',
  B: 'last_name',
  C: 'phone',
  D: 'email',
  E: 'product_interest',
  F: 'state',
  G: 'source',
  H: 'notes',
  I: 'stage',
}

function colToIndex(col: string) {
  return col.toUpperCase().charCodeAt(0) - 65
}

async function getGoogleSheets() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

// POST — triggered by cron every 15 minutes
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const sheets = await getGoogleSheets()

  // Get all active sync configs
  const { data: syncConfigs } = await supabase
    .from('sheet_syncs')
    .select('*, agencies(id)')
    .eq('active', true)

  if (!syncConfigs?.length) return NextResponse.json({ synced: 0 })

  let totalImported = 0
  let totalExported = 0

  for (const config of syncConfigs) {
    try {
      const colMap: Record<string, string> = { ...DEFAULT_COLUMN_MAP, ...((config.column_mapping as Record<string, string>) ?? {}) }

      // ── IMPORT: Read sheet rows → create/update leads ──
      if (['import', 'both'].includes(config.sync_direction)) {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: config.spreadsheet_id,
          range: `${config.sheet_name}!A2:Z`,  // Skip header row
        })

        const rows = response.data.values ?? []

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]
          if (!row || !row[0]) continue

          // Map row columns to lead fields
          const leadData: Record<string, any> = {
            agency_id: config.agency_id,
            google_sheet_row: i + 2,  // 1-indexed, +1 for header
          }

          for (const [col, field] of Object.entries(colMap)) {
            const val = row[colToIndex(col)]
            if (val !== undefined && val !== '') leadData[field] = val
          }

          if (!leadData.first_name && !leadData.phone) continue

          // Upsert by phone or by sheet row
          await supabase.from('leads')
            .upsert(leadData, {
              onConflict: 'agency_id,google_sheet_row',
              ignoreDuplicates: false,
            })

          totalImported++
        }

        // Update last_synced
        await supabase.from('sheet_syncs')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', config.id)
      }

      // ── EXPORT: Read updated leads → write back to sheet ──
      if (['export', 'both'].includes(config.sync_direction)) {
        const since = config.last_synced_at ?? new Date(Date.now() - 15 * 60 * 1000).toISOString()

        const { data: updatedLeads } = await supabase
          .from('leads')
          .select('*')
          .eq('agency_id', config.agency_id)
          .gte('updated_at', since)
          .not('google_sheet_row', 'is', null)

        if (updatedLeads?.length) {
          const updates = updatedLeads.map(lead => ({
            range: `${config.sheet_name}!A${lead.google_sheet_row}:J${lead.google_sheet_row}`,
            values: [[
              lead.first_name, lead.last_name, lead.phone, lead.email,
              lead.product_interest, lead.state, lead.source, lead.notes,
              lead.stage, lead.lead_score,
            ]],
          }))

          await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: config.spreadsheet_id,
            requestBody: {
              valueInputOption: 'RAW',
              data: updates,
            },
          })

          totalExported += updatedLeads.length
        }
      }
    } catch (err) {
      console.error(`Sync failed for spreadsheet ${config.spreadsheet_id}:`, err)
    }
  }

  return NextResponse.json({
    ok: true,
    imported: totalImported,
    exported: totalExported,
    timestamp: new Date().toISOString(),
  })
}

// GET — manual trigger or status check
export async function GET(req: NextRequest) {
  const supabase = createServiceRoleClient()
  const { data: configs } = await supabase
    .from('sheet_syncs')
    .select('spreadsheet_id,sheet_name,last_synced_at,active,sync_direction')

  return NextResponse.json({ configs })
}
