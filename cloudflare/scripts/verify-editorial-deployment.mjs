import { readFileSync } from 'node:fs';

const [deploymentPath, environment, sourceSha] = process.argv.slice(2);
if (!deploymentPath || !['staging', 'production'].includes(environment) || !/^[0-9a-f]{40}$/i.test(sourceSha ?? '')) {
  throw new Error('EDITORIAL_DEPLOYMENT_READBACK_ARGUMENTS_INVALID');
}

const deployments = JSON.parse(readFileSync(deploymentPath, 'utf8'));
if (!Array.isArray(deployments) || deployments.length === 0) {
  throw new Error('EDITORIAL_DEPLOYMENT_READBACK_EMPTY');
}
const dated = deployments.map((deployment) => {
  const createdOn = Date.parse(deployment?.created_on ?? '');
  if (!Number.isFinite(createdOn)) throw new Error('EDITORIAL_DEPLOYMENT_TIMESTAMP_INVALID');
  return { deployment, createdOn };
});
const newestTime = Math.max(...dated.map(({ createdOn }) => createdOn));
const newest = dated.filter(({ createdOn }) => createdOn === newestTime);
if (newest.length !== 1) throw new Error('EDITORIAL_DEPLOYMENT_TIMESTAMP_AMBIGUOUS');
const latest = newest[0].deployment;
const expectedMessage = `service ${environment} ${sourceSha}`;
const versions = latest?.versions;
if (latest?.annotations?.['workers/message'] !== expectedMessage ||
    !Array.isArray(versions) || versions.length !== 1 ||
    versions[0]?.percentage !== 100 || typeof versions[0]?.version_id !== 'string') {
  throw new Error('EDITORIAL_DEPLOYMENT_DOES_NOT_MATCH_EXPECTED_SOURCE');
}

console.log(`Verified ${environment} deployment for ${sourceSha} at 100% traffic`);
