import app from '../app.js';

const PORT = 5001;

const server = app.listen(PORT, async () => {
  console.log(`Test server running on port ${PORT}`);
  try {
    const res = await fetch(`http://localhost:${PORT}/api/health`);
    const status = res.status;
    const data = await res.json();

    console.log('Health check status:', status);
    console.log('Health check response:', JSON.stringify(data, null, 2));

    if (
      status === 200 &&
      data.success === true &&
      data.message === 'Coy Discover API is running'
    ) {
      console.log('Backend health verification PASSED');
      server.close(() => process.exit(0));
    } else {
      console.error('Backend health verification FAILED: Unexpected response');
      server.close(() => process.exit(1));
    }
  } catch (err) {
    console.error('Backend health verification FAILED with error:', err.message);
    server.close(() => process.exit(1));
  }
});
