import { CircleCheck, Copy, Download, FileText, ShieldAlert } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

import { DialogError } from '@/components/ui/DialogError';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { ApiRequestError, api, type ContentFlag, type NcmecReportDetail, type NcmecReportSummary } from '@/lib/api';
import { useAdminNcmecQuery, useAdminNcmecReportQuery, useCheckAdminNcmecMutation, useReportContentFlagNcmecMutation } from '@/lib/api/dashboardQueries';
import { cn, downloadBlob } from '@/lib/utils';

import { UserCell } from './adminUi';
import { BLOCK_REASON_MAX } from './BlockUserDialog';


// what's DMed to them with the block: nothing about the report or an investigation
const NCMEC_BLOCK_REASON = 'Breaking NotSoBot’s rules.';
// where a draft is filed by hand while the api has no NCMEC credentials
const NCMEC_WEBSITE_URL = 'https://report.cybertip.org/';
// the form's "Summarize what happened" box
const NCMEC_SUMMARY_MAX = 3000;

// as the form counts it: each newline is submitted as \r\n
function formLength(text: string): number {
  return text.length + (text.match(/\n/g)?.length ?? 0);
}

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

function formatBytes(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

// a drafted report: its text to paste into NCMEC's website form, and the saved files to attach there
export function NcmecDraftView({ report }: {report: NcmecReportDetail}) {
  const toast = useToast();
  const textId = useId();
  const summaryId = useId();
  const [ downloading, setDownloading ] = useState<number | null>(null);
  const [ fileError, setFileError ] = useState<string | null>(null);
  const text = report.report_text ?? '';
  const summary = report.report_summary ?? '';
  const summaryLength = formLength(summary);

  const copy = async (value: string, what: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast(`Copied the ${what}`);
    } catch {
      toast('Couldn’t copy, select the text and copy it instead');
    }
  };

  const downloadFile = async (index: number, filename: string) => {
    setDownloading(index);
    setFileError(null);
    try {
      downloadBlob(filename, await api.fetchAdminNcmecReportFile(report.id, index));
    } catch (error) {
      setFileError(ncmecErrorMessage(error));
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className='space-y-3' data-state='draft'>
      <div className='rounded-md border border-warning/40 bg-warning/15 p-3 text-sm'>
        <p className='font-semibold text-white'>Not sent to NCMEC yet.</p>
        <p className='mt-1 text-muted'>
          The hold is in place and everything is saved (draft #{report.id}). File it on{' '}
          <a href={NCMEC_WEBSITE_URL} target='_blank' rel='noreferrer' className='text-white underline'>NCMEC’s CyberTipline form</a>{' '}
          with the text below, attach the files, then mark the flag reported with the CyberTipline number.
        </p>
      </div>
      {(report.error) ? <p className='text-sm break-words text-danger-text'>{report.error}</p> : null}
      {(summary) ? (
        <div>
          <div className='mb-1.5 flex items-center gap-2'>
            <label htmlFor={summaryId} className='text-sm text-muted'>
              For “Summarize what happened”{' '}
              <span className={cn((summaryLength > NCMEC_SUMMARY_MAX) ? 'text-danger-text' : 'text-subtle')}>({summaryLength} / {NCMEC_SUMMARY_MAX})</span>
            </label>
            <button type='button' className='btn btn-secondary btn-sm ml-auto' onClick={() => copy(summary, 'summary')}>
              <Copy aria-hidden className='size-3.5'/>
              Copy
            </button>
          </div>
          <textarea id={summaryId} readOnly value={summary} rows={6} className='input text-xs' onFocus={(event) => event.target.select()}/>
        </div>
      ) : null}
      <div>
        <div className='mb-1.5 flex items-center gap-2'>
          <label htmlFor={textId} className='text-sm text-muted'>Report text{(summary) ? ', for the other fields' : ''}</label>
          <button type='button' className='btn btn-secondary btn-sm ml-auto' onClick={() => copy(text, 'report text')} disabled={!text}>
            <Copy aria-hidden className='size-3.5'/>
            Copy
          </button>
          <button
            type='button'
            className='btn btn-secondary btn-sm'
            disabled={!text}
            onClick={() => downloadBlob(`ncmec-draft-${report.id}-flag-${report.flag_id}.txt`, new Blob([text], {type: 'text/plain'}))}
          >
            <FileText aria-hidden className='size-3.5'/>
            .txt
          </button>
        </div>
        <textarea id={textId} readOnly value={text} rows={12} className='input font-mono text-xs' onFocus={(event) => event.target.select()}/>
      </div>
      <div>
        <p className='mb-1.5 text-sm text-muted'>Files to attach ({report.evidence_files.length})</p>
        {(report.evidence_files.length) ? (
          <ul className='space-y-1.5'>
            {report.evidence_files.map((file, index) => (
              <li key={`${index}-${file.filename}`} className='flex items-center gap-2 text-sm'>
                <span className='min-w-0 flex-1 truncate font-mono text-xs' title={`SHA-256 ${file.sha256}`}>{file.filename}</span>
                <span className='shrink-0 text-xs text-subtle'>{formatBytes(file.size)}</span>
                <button type='button' className='btn btn-secondary btn-sm shrink-0' disabled={downloading !== null} onClick={() => downloadFile(index, file.filename)}>
                  {(downloading === index) ? <Spinner className='size-3.5'/> : <Download aria-hidden className='size-3.5'/>}
                  Download
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className='text-sm text-subtle'>No files were saved: the frames had expired and the input image couldn’t be fetched.</p>
        )}
        {(fileError) ? <p className='mt-1.5 text-sm text-danger-text'>{fileError}</p> : null}
      </div>
    </div>
  );
}

// the draft again later, from the flag's "View report" link
function NcmecDraftDialog({ reportId, onClose }: {reportId: string, onClose: () => void}) {
  const titleId = useId();
  const query = useAdminNcmecReportQuery(reportId);
  return (
    <Modal labelledBy={titleId} onClose={onClose} className='max-w-xl'>
      <div className='p-5 sm:p-6'>
        <h2 id={titleId} className='flex items-center gap-2 pr-10 text-lg font-semibold text-white'>
          <ShieldAlert aria-hidden className='size-5 text-danger-text'/>
          NCMEC report draft #{reportId}
        </h2>
        <div className='mt-3'>
          {(query.data) ? <NcmecDraftView report={query.data}/> : (query.isError) ? (
            <DialogError>{ncmecErrorMessage(query.error)}</DialogError>
          ) : <p className='text-sm text-muted'>Loading the draft…</p>}
        </div>
        <div className='mt-6 flex justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose}>Close</button>
        </div>
      </div>
    </Modal>
  );
}

export function NcmecReportLine({ report, className }: {report: NcmecReportSummary, className?: string}) {
  const [ viewing, setViewing ] = useState(false);
  const test = report.environment !== 'production';
  if (report.status === 'draft') {
    return (
      <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-warning-text', className)}>
        <span>NCMEC report drafted, not sent: file it on NCMEC’s website</span>
        <button type='button' className='text-white underline' onClick={() => setViewing(true)}>View report</button>
        {(viewing) ? <NcmecDraftDialog reportId={report.id} onClose={() => setViewing(false)}/> : null}
      </div>
    );
  }
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
  const [ done, setDone ] = useState<NcmecReportDetail | null>(null);

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
        toast((filed.status === 'draft')
          ? 'Saved and drafted: file the report on NCMEC’s website'
          : `Filed CyberTipline report #${filed.report_id}${(filed.environment === 'production') ? '' : ' (test)'}`);
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
          if (!pending && !done && !status.isPending && confirmed) {
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
              Not So LLC is registered as an electronic service provider.
            </p>
            <p className='mt-1 text-muted'>
              Until then this still places the hold{(block) ? ' and the block' : ''}, saves the files, and writes the report out
              as text for you to file on NCMEC’s website. Nothing is sent.
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

        {(done?.status === 'draft') ? (
          <div className='mt-4'>
            <NcmecDraftView report={done}/>
            <p className='mt-2 text-sm text-muted'>{(user) ? `${user.username} is on legal hold${(block) ? ' and blocked' : ''}.` : ''}</p>
          </div>
        ) : (done) ? (
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
              <Check checked={confirmed} onChange={setConfirmed} disabled={pending || status.isPending}>
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
            <button type='submit' className='btn btn-danger' disabled={pending || status.isPending || !confirmed}>
              {(pending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
              {(!configured) ? 'Hold and draft report' : (production) ? 'Report to NCMEC' : 'Send test report'}
            </button>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}
