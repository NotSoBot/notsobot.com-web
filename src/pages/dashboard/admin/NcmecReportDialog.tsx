import { CircleCheck, ShieldAlert } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

import { DialogError } from '@/components/ui/DialogError';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { ApiRequestError, type ContentFlag, type NcmecReportSummary } from '@/lib/api';
import { useAdminNcmecQuery, useCheckAdminNcmecMutation, useReportContentFlagNcmecMutation } from '@/lib/api/dashboardQueries';
import { cn } from '@/lib/utils';

import { UserCell } from './adminUi';
import { BLOCK_REASON_MAX } from './BlockUserDialog';


// what's DMed to them with the block: nothing about the report or an investigation
const NCMEC_BLOCK_REASON = 'Breaking NotSoBot’s rules.';

// the api's own message: NCMEC's refusals come back as 502/503, which `errorMessage` turns into a generic one
function ncmecErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError && error.body?.message) {
    return error.body.message;
  }
  return 'Couldn’t reach the api.';
}

function Check({ checked, onChange, disabled, children, hint }: {
  checked: boolean,
  onChange: (value: boolean) => void,
  disabled?: boolean,
  children: ReactNode,
  hint?: ReactNode,
}) {
  const id = useId();
  return (
    <label htmlFor={id} className='flex cursor-pointer items-start gap-2 text-sm'>
      <input id={id} type='checkbox' checked={checked} onChange={(event) => onChange(event.target.checked)} disabled={disabled} className='mt-0.5'/>
      <span>
        <span className='font-medium text-white'>{children}</span>
        {(hint) ? <span className='mt-0.5 block text-muted'>{hint}</span> : null}
      </span>
    </label>
  );
}

function Field({ label, value, onChange, disabled, max, rows = 2, placeholder }: {
  label: string,
  value: string,
  onChange: (value: string) => void,
  disabled?: boolean,
  max: number,
  rows?: number,
  placeholder?: string,
}) {
  const id = useId();
  return (
    <div className='mt-3'>
      <label htmlFor={id} className='mb-1.5 block text-sm text-muted'>{label}</label>
      <textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} maxLength={max} rows={rows} disabled={disabled} placeholder={placeholder} className='input'/>
    </div>
  );
}

export function NcmecReportLine({ report, className }: {report: NcmecReportSummary, className?: string}) {
  const test = report.environment !== 'production';
  if (report.status === 'finished') {
    return (
      <p className={cn('flex items-center gap-1.5 text-sm text-success-text', className)}>
        <CircleCheck aria-hidden className='size-4 shrink-0'/>
        <span>Reported to NCMEC: CyberTipline #{report.report_id}{(test) ? ' (test environment, not a real report)' : ''}</span>
      </p>
    );
  }
  if (report.status === 'failed') {
    return <p className={cn('text-sm break-words text-danger-text', className)}>NCMEC report failed{(test) ? ' (test)' : ''}: {report.error}</p>;
  }
  return <p className={cn('text-sm text-muted', className)}>An NCMEC report is being filed…</p>;
}


// Owners only. Puts the uploader on legal hold, blocks them (optional), then files a CyberTipline report with everything
// the api has on the flag: the user, where it happened, their prompt, the kept frames, the input image, the Anthropic
// review ids. Nothing can be taken back once NCMEC has it, so it asks to confirm
export function NcmecReportDialog({ flag, onClose }: {flag: ContentFlag, onClose: () => void}) {
  const titleId = useId();
  const incidentId = useId();
  const toast = useToast();
  const status = useAdminNcmecQuery();
  const check = useCheckAdminNcmecMutation();
  const report = useReportContentFlagNcmecMutation();

  const { user } = flag;
  const review = flag.auto_review as (Record<string, unknown> | null | undefined);
  const generated = (flag.command_id ?? '').startsWith('tools.ml.');
  const [ incidentType, setIncidentType ] = useState('Child Pornography (possession, manufacture, and distribution)');
  const [ fileViewed, setFileViewed ] = useState(false);
  const [ generativeAi, setGenerativeAi ] = useState(generated);
  const [ includeInput, setIncludeInput ] = useState(!!flag.source_url);
  const [ block, setBlock ] = useState(!user?.blocked);
  const [ blockReason, setBlockReason ] = useState(NCMEC_BLOCK_REASON);
  const [ relatedReports, setRelatedReports ] = useState('');
  const [ notes, setNotes ] = useState('');
  const [ escalate, setEscalate ] = useState('');
  const [ confirmed, setConfirmed ] = useState(false);
  const [ done, setDone ] = useState<NcmecReportSummary | null>(null);

  const configured = !!status.data?.configured;
  const production = status.data?.environment === 'production';
  const pending = report.isPending;

  const submit = () => {
    report.mutate({flagId: flag.id, body: {
      incident_type: incidentType,
      file_viewed: fileViewed,
      generative_ai: generativeAi,
      include_input_image: includeInput,
      escalate: escalate.trim() || null,
      related_reports: relatedReports.trim() || null,
      notes: notes.trim() || null,
      block,
      block_reason: blockReason.trim() || null,
    }}, {
      onSuccess: ({ report: filed }) => {
        setDone(filed);
        toast(`Filed CyberTipline report #${filed.report_id}${(filed.environment === 'production') ? '' : ' (test)'}`);
      },
    });
  };

  return (
    <Modal labelledBy={titleId} onClose={() => !pending && onClose()} className='max-w-xl'>
      <form
        className='p-5 sm:p-6'
        data-state={(pending) ? 'saving' : (report.isError) ? 'error' : (done) ? 'done' : 'idle'}
        onSubmit={(event) => {
          event.preventDefault();
          if (!pending && !done && configured && confirmed) {
            submit();
          }
        }}
      >
        <h2 id={titleId} className='flex items-center gap-2 pr-10 text-lg font-semibold text-white'>
          <ShieldAlert aria-hidden className='size-5 text-danger-text'/>
          Report flag #{flag.id} to NCMEC?
        </h2>

        {(status.isPending) ? (
          <p className='mt-3 text-sm text-muted'>Checking NCMEC setup…</p>
        ) : (!configured) ? (
          <div className='mt-3 rounded-md border border-danger/40 bg-danger/15 p-3 text-sm'>
            <p className='font-semibold text-white'>NCMEC reporting isn’t set up.</p>
            <p className='mt-1 text-muted'>
              The api needs {(status.data?.missing ?? []).join(', ') || 'its NCMEC settings'}. Credentials come from NCMEC once
              Not So LLC is registered as an electronic service provider. Until then, report on NCMEC’s website.
            </p>
          </div>
        ) : (
          <div className={cn('mt-3 rounded-md border p-3 text-sm', (production) ? 'border-danger/40 bg-danger/15' : 'border-warning/40 bg-warning/15')}>
            <p className='font-semibold text-white'>
              {(production) ? 'Production: this files a real CyberTipline report.' : 'Test environment: NCMEC won’t act on this, and the flag isn’t marked reported.'}
            </p>
            <p className='mt-1 text-muted'>Contact on the report: {status.data?.reporter_email}</p>
            <button type='button' className='btn btn-secondary btn-sm mt-2' disabled={check.isPending} onClick={() => check.mutate()}>
              {(check.isPending) ? <Spinner className='size-3.5'/> : null}
              Check connection
            </button>
            {(check.data?.check) ? (
              <p className={cn('mt-1.5 break-words', (check.data.check.ok) ? 'text-success' : 'text-danger-text')}>{check.data.check.description}</p>
            ) : (check.isError) ? <p className='mt-1.5 text-danger-text'>{ncmecErrorMessage(check.error)}</p> : null}
          </div>
        )}

        <div className='mt-3 rounded-md border border-line bg-deep p-3 text-sm'>
          <UserCell user={user} fallbackId={flag.user_id}/>
          <ul className='mt-2 list-disc space-y-0.5 pl-5 text-muted'>
            <li>Their Discord id, username and profile, and the addresses of their own dashboard logins</li>
            <li>Where it happened: server, channel and message{(flag.command_id) ? `, the ${flag.command_id} command` : ''}{(flag.query) ? ', their prompt or script' : ''}</li>
            <li>{(flag.frames_kept) ? 'The flagged frames kept for review' : 'No flagged frames: they weren’t kept or have expired'}</li>
            {(flag.source_url) ? <li>The image they attached, if Discord still serves it</li> : null}
            {(review?.model) ? (
              <li>
                The Anthropic review: {String(review.model)}
                {(review.batch_id) ? <>, batch <span className='font-mono'>{String(review.batch_id)}</span></> : null}
                {(review.message_id) ? <>, message <span className='font-mono'>{String(review.message_id)}</span></> : null}
                {(review.decision) ? `, verdict ${String(review.decision)}` : ''}
              </li>
            ) : null}
          </ul>
        </div>

        {(done) ? (
          <div className='mt-4 rounded-md border border-line p-3'>
            <NcmecReportLine report={done}/>
            <p className='mt-1 text-sm text-muted'>{done.files} file(s) attached. {(user) ? `${user.username} is on legal hold${(block) ? ' and blocked' : ''}.` : ''}</p>
          </div>
        ) : (
          <>
            <div className='mt-4'>
              <label htmlFor={incidentId} className='mb-1.5 block text-sm text-muted'>Incident type</label>
              <select id={incidentId} className='input' value={incidentType} disabled={pending} onChange={(event) => setIncidentType(event.target.value)}>
                {(status.data?.incident_types ?? [incidentType]).map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>

            <div className='mt-4 space-y-3 rounded-md border border-line p-3'>
              <Check checked={fileViewed} onChange={setFileViewed} disabled={pending} hint='Tell NCMEC whether a person here looked at all of the attached frames. Law enforcement treats viewed and unviewed files differently.'>
                I viewed all of the flagged frames
              </Check>
              <Check checked={generativeAi} onChange={setGenerativeAi} disabled={pending} hint='Marks the frames as AI generated, as anything from an imagine or edit command is.'>
                Generated by AI
              </Check>
              {(flag.source_url) ? (
                <Check checked={includeInput} onChange={setIncludeInput} disabled={pending} hint='Fetched again from Discord and attached as supporting material.'>
                  Attach the image they sent
                </Check>
              ) : null}
              {(user && !user.blocked) ? (
                <Check checked={block} onChange={setBlock} disabled={pending} hint='Permanent. They get a DM with the reason below, which says nothing about the report.'>
                  Block {user.username} from NotSoBot
                </Check>
              ) : null}
              {(block && user && !user.blocked) ? <Field label='Block reason (DMed to them)' value={blockReason} onChange={setBlockReason} disabled={pending} max={BLOCK_REASON_MAX}/> : null}
              <p className='text-xs text-subtle'>They also go on legal hold before anything is sent: nothing of theirs can be deleted, and the frames stop expiring.</p>
            </div>

            <Field
              label='Related reports (optional)'
              value={relatedReports}
              onChange={setRelatedReports}
              disabled={pending}
              max={3000}
              placeholder='Like another CyberTipline report about the same content, and its reference'
            />
            <Field label='Notes for NCMEC (optional)' value={notes} onChange={setNotes} disabled={pending} max={5000} rows={3}/>
            <Field
              label='Escalate as high priority (optional)'
              value={escalate}
              onChange={setEscalate}
              disabled={pending}
              max={3000}
              placeholder='Only if a child may be in immediate danger: say why'
            />

            <div className='mt-4 rounded-md border border-danger/40 p-3'>
              <Check checked={confirmed} onChange={setConfirmed} disabled={pending || !configured}>
                This is apparent child sexual exploitation and I’m reporting it to NCMEC
              </Check>
            </div>
          </>
        )}

        {(report.isError) ? (
          <DialogError className='mt-4'>
            {ncmecErrorMessage(report.error)} The hold and block (if chosen) are in place, so you can try again.
          </DialogError>
        ) : null}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={pending}>{(done) ? 'Close' : 'Cancel'}</button>
          {(!done) ? (
            <button type='submit' className='btn btn-danger' disabled={pending || !configured || !confirmed}>
              {(pending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
              {(production) ? 'Report to NCMEC' : 'Send test report'}
            </button>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}
