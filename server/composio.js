let _client = null

function getComposioClient() {
  if (!_client) {
    const { Composio } = require('composio-core')
    _client = new Composio({ apiKey: process.env.COMPOSIO_API_KEY })
  }
  return _client
}

module.exports = { getComposioClient }
