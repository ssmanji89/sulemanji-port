import { readFileSync } from 'node:fs';

const [deploymentPath, environment, sourceSha, versionPath] = process.argv.slice(2);
const selectVersion = environment === '--active-version';
if (!deploymentPath || (!selectVersion &&
    (!['staging', 'production'].includes(environment) || !/^[0-9a-f]{40}$/i.test(sourceSha ?? '') || !versionPath))) {
  throw new Error('EDITORIAL_DEPLOYMENT_READBACK_ARGUMENTS_INVALID');
}

const deployments = JSON.parse(readFileSync(deploymentPath, 'utf8'));
if (!Array.isArray(deployments) || deployments.length === 0) {
  throw new Error('EDITORIAL_DEPLOYMENT_READBACK_EMPTY');
}
function parseIsoTimestamp(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!match) return Number.NaN;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , , offsetHourText, offsetMinuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const offsetHour = offsetHourText === undefined ? 0 : Number(offsetHourText);
  const offsetMinute = offsetMinuteText === undefined ? 0 : Number(offsetMinuteText);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (year < 1000 || calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() + 1 !== month ||
      calendarDate.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59 ||
      offsetHour > 14 || offsetMinute > 59 || (offsetHour === 14 && offsetMinute !== 0)) {
    return Number.NaN;
  }
  return Date.parse(value);
}
const dated = deployments.map((deployment) => {
  const createdOn = parseIsoTimestamp(deployment?.created_on ?? '');
  if (!Number.isFinite(createdOn)) throw new Error('EDITORIAL_DEPLOYMENT_TIMESTAMP_INVALID');
  return { deployment, createdOn };
});
const newestTime = Math.max(...dated.map(({ createdOn }) => createdOn));
const newest = dated.filter(({ createdOn }) => createdOn === newestTime);
if (newest.length !== 1) throw new Error('EDITORIAL_DEPLOYMENT_TIMESTAMP_AMBIGUOUS');
const versions = newest[0].deployment?.versions;
const activeVersionId = versions?.[0]?.version_id;
if (!Array.isArray(versions) || versions.length !== 1 || versions[0]?.percentage !== 100 ||
    typeof activeVersionId !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(activeVersionId)) {
  throw new Error('EDITORIAL_DEPLOYMENT_REQUIRES_ONE_ACTIVE_VERSION');
}

if (selectVersion) {
  console.log(activeVersionId);
} else {
  const version = JSON.parse(readFileSync(versionPath, 'utf8'));
  if (version?.id !== activeVersionId || version?.annotations?.['workers/message'] !== `service ${environment} ${sourceSha}`) {
    throw new Error('EDITORIAL_DEPLOYMENT_DOES_NOT_MATCH_EXPECTED_SOURCE');
  }
  console.log(`Verified ${environment} deployment for ${sourceSha} at 100% traffic`);
}
