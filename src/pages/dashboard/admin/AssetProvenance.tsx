import { type AssetProvenance } from '@/lib/api';
import { cn, formatDateTime } from '@/lib/utils';

import { adminUserPath, CopyableValue, ExactDate } from './adminUi';


// Where a file came from (who uploaded it, the url it was downloaded from, its hash), from the admin routes'
// `provenance`. Files from before it was recorded say so instead
export function AssetProvenanceLine({ provenance, ownerId, className }: {
  provenance: AssetProvenance | undefined,
  // the tag's owner, so "uploaded by" can say it was them
  ownerId?: string | null,
  className?: string,
}) {
  if (!provenance) {
    return null;
  }
  const { created, requested_by, replaces_id, sha256, source_url, uploaded_by } = provenance;
  if (!uploaded_by && !sha256 && !source_url) {
    return <p className={cn('text-xs text-subtle italic', className)}>Uploaded before uploads were recorded</p>;
  }
  return (
    <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-subtle', className)}>
      {(uploaded_by) ? (
        <span className='inline-flex min-w-0 items-center gap-1'>
          Uploaded by {(uploaded_by === ownerId) ? 'the owner' : null}
          <CopyableValue value={uploaded_by} truncate={0} to={adminUserPath(uploaded_by)} linkTitle='Open in users'/>
        </span>
      ) : null}
      {(created) ? <ExactDate value={created} format={formatDateTime}/> : null}
      {(requested_by) ? <span>asked for by the owner</span> : null}
      {(source_url) ? (
        <span className='inline-flex min-w-0 max-w-full items-center gap-1'>
          from
          <a href={source_url} target='_blank' rel='noreferrer noopener nofollow' title={source_url} className='truncate font-mono text-brand hover:underline'>
            {source_url}
          </a>
        </span>
      ) : (uploaded_by) ? <span>a file upload</span> : null}
      {(sha256) ? (
        <span className='inline-flex items-center gap-1'>
          sha256 <CopyableValue value={sha256} truncate={12}/>
        </span>
      ) : null}
      {(replaces_id) ? (
        <span className='inline-flex items-center gap-1'>
          new version of <CopyableValue value={replaces_id} truncate={0}/>
        </span>
      ) : null}
    </div>
  );
}
