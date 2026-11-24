// Generate a reviewable Digital Asset Links document from a real release certificate.
// Usage: node android/generate-assetlinks.mjs <SHA-256 fingerprint>
// Obtain the fingerprint from your own release certificate or Play App Signing.
const args = process.argv.slice(2);
if (!args.length || args.some(x => !/^(?:[0-9a-f]{2}:){31}[0-9a-f]{2}$/i.test(x))) {
  console.error('Supply genuine colon-separated SHA-256 release certificate fingerprint(s). Never use an ephemeral CI debug certificate.');
  process.exit(1);
}
const fingerprints = [...new Set(args.map(x => x.toUpperCase()))];
if (fingerprints.some(x => new Set(x.split(':')).size < 4)) {
  console.error('Rejecting obvious placeholder fingerprint.');
  process.exit(1);
}
process.stdout.write(JSON.stringify([{
  relation: ['delegate_permission/common.handle_all_urls'],
  target: {
    namespace: 'android_app',
    package_name: 'com.slashpromo.app',
    sha256_cert_fingerprints: fingerprints
  }
}], null, 2) + '\n');
