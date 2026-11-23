const { Router } = require('express');
const swaggerUi = require('swagger-ui-express');
const buildSpec = require('../../docs/openapi');

const router = Router();

router.get('/openapi.json', (req, res) => res.json(buildSpec()));
router.use(
  '/',
  swaggerUi.serve,
  swaggerUi.setup(null, { customSiteTitle: 'MediBook API', swaggerOptions: { url: '/docs/openapi.json' } }),
);

module.exports = router;
