import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

function webhookPlugin() {
  return {
    name: 'webhook-endpoint-handler',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = req.url || '';
        if (url.startsWith('/api/webhook')) {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk: any) => {
              body += chunk;
            });
            req.on('end', async () => {
              try {
                // Extract key from URL /api/webhook/:key or query param
                const urlPath = url.split('?')[0];
                const urlParts = urlPath.split('/').filter(Boolean);
                let webhookKey = urlParts.length > 2 ? urlParts[urlParts.length - 1] : '';
                if (!webhookKey || webhookKey === 'webhook') {
                  const searchParams = new URLSearchParams(url.split('?')[1] || '');
                  webhookKey = searchParams.get('key') || searchParams.get('webhook_key') || '';
                }

                let payload: any = {};
                try {
                  payload = body ? JSON.parse(body) : {};
                } catch (e) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
                  return;
                }

                // Query Firestore REST API for webhooks to validate key
                const projectId = 'tech-lab-crm';
                const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

                let matchedDoc: any = null;
                let webhookDocId = '';

                try {
                  const listResp = await fetch(`${baseUrl}/webhooks`);
                  if (listResp.ok) {
                    const listData = (await listResp.json()) as any;
                    if (listData.documents) {
                      for (const doc of listData.documents) {
                        const fields = doc.fields || {};
                        const key = fields.webhook_key?.stringValue;
                        const active = fields.active?.booleanValue !== false;
                        if (key === webhookKey) {
                          matchedDoc = doc;
                          webhookDocId = doc.name.split('/').pop() || '';
                          if (!active) {
                            res.statusCode = 403;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ error: 'Webhook is inactive/disabled' }));
                            return;
                          }
                          break;
                        }
                      }
                    }
                  }
                } catch (err) {
                  console.warn('Error verifying webhook via REST:', err);
                }

                if (!matchedDoc && !webhookKey.startsWith('whk_')) {
                  res.statusCode = 404;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: `Invalid or missing webhook key: "${webhookKey}"` }));
                  return;
                }

                const webhookName = matchedDoc?.fields?.name?.stringValue || 'Webhook Integration';
                const currentTotal = parseInt(matchedDoc?.fields?.total_received?.integerValue || '0', 10);

                // Prepare new lead
                const name =
                  payload.name ||
                  payload.student_name ||
                  payload.full_name ||
                  payload.candidate_name ||
                  payload['Student Name'] ||
                  payload['Full Name'] ||
                  'New Webhook Lead';
                const phone =
                  payload.phone ||
                  payload.mobile ||
                  payload.contact ||
                  payload.whatsapp ||
                  payload['Phone'] ||
                  payload['Mobile'] ||
                  '';
                const email = payload.email || payload.email_address || payload['Email'] || '';
                const source = payload.source || webhookName;
                const course =
                  payload.course_interest || payload.course || payload['Course'] || 'Other';
                const mode = String(
                  payload.class_mode || payload.mode || payload['Class Mode'] || ''
                )
                  .toLowerCase()
                  .includes('online')
                  ? 'Online'
                  : 'Offline';
                const address = payload.address || payload.city || payload['City'] || '';
                const dob = payload.dob || payload.birthdate || '';
                const nowISO = new Date().toISOString();

                // Raw payload note
                const noteText = `⚡ Captured via Webhook: "${webhookName}"\nKey: ${webhookKey}\nReceived At: ${new Date().toLocaleString('en-IN')}\n\n--- Payload Received ---\n${JSON.stringify(payload, null, 2)}`;

                // Create lead doc in Firestore REST API
                const leadDoc = {
                  fields: {
                    name: { stringValue: name },
                    phone: { stringValue: phone },
                    email: { stringValue: email },
                    source: { stringValue: source },
                    course_interest: { stringValue: course },
                    status: { stringValue: 'New' },
                    assigned_batch: { stringValue: 'Unassigned' },
                    lead_score: { stringValue: payload.lead_score || 'Warm' },
                    created_date: { stringValue: nowISO },
                    tags: {
                      arrayValue: {
                        values: [{ stringValue: `Webhook: ${webhookName}` }],
                      },
                    },
                    address: { stringValue: address },
                    converted_to_student: { booleanValue: false },
                    class_mode: { stringValue: mode },
                    dob: { stringValue: dob },
                    notes_history: {
                      arrayValue: {
                        values: [
                          {
                            mapValue: {
                              fields: {
                                id: { stringValue: 'note_' + Date.now() },
                                note_text: { stringValue: noteText },
                                timestamp: { stringValue: nowISO },
                                added_by: { stringValue: 'Webhook Ingestion System' },
                                is_system: { booleanValue: true },
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                };

                const createResp = await fetch(`${baseUrl}/leads`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(leadDoc),
                });

                let leadId = '';
                if (createResp.ok) {
                  const createData = (await createResp.json()) as any;
                  leadId = createData.name.split('/').pop() || '';
                }

                // Update webhook document stats if doc ID found
                if (webhookDocId) {
                  await fetch(
                    `${baseUrl}/webhooks/${webhookDocId}?updateMask.fieldPaths=total_received&updateMask.fieldPaths=last_received_timestamp`,
                    {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        fields: {
                          total_received: { integerValue: String(currentTotal + 1) },
                          last_received_timestamp: { stringValue: nowISO },
                        },
                      }),
                    }
                  ).catch(() => {});
                }

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    success: true,
                    message: 'Lead received and created successfully in CRM',
                    leadId,
                    received_at: nowISO,
                  })
                );
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
              }
            });
            return;
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              status: 'active',
              message:
                'Tech Lab CRM Webhook Endpoint is online. Send a POST request with JSON body to ingest leads.',
            })
          );
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), webhookPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
