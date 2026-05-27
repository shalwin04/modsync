import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createServer, getServerPort } from '@devvit/web/server';
import { api } from './routes/api';
import { forms } from './routes/forms';
import { menu } from './routes/menu';
import { triggers } from './routes/triggers';
import { dossier } from './routes/dossier';
import { dossierMenu } from './routes/dossier-menu';
import { alerts } from './routes/alerts';
import { dashboard } from './routes/dashboard';
import { demo } from './routes/demo';

const app = new Hono();
const internal = new Hono();

internal.route('/menu', menu);
internal.route('/menu', dossierMenu);
internal.route('/form', forms);
internal.route('/triggers', triggers);
internal.route('/alerts', alerts);

app.route('/api', api);
app.route('/api/dossier', dossier);
app.route('/api/dashboard', dashboard);
app.route('/api/demo', demo);
app.route('/internal', internal);

serve({
  fetch: app.fetch,
  createServer,
  port: getServerPort(),
});
