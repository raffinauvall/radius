import { server } from '../server.js';

export default function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const path = url.searchParams.get('__radius_path');

  if (path !== null) {
    url.searchParams.delete('__radius_path');
    req.url = `${path}${url.search}`;
  }

  server.emit('request', req, res);
}
