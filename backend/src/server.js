const app = require('./app');

const PORT = process.env.PORT || 8000;

module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Aves server running on http://localhost:${PORT}`);
  });
}
