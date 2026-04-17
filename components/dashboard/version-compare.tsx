import { Card } from "@/components/ui/card";
import type { ResumeVersionRecord } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

function lines(content: string) {
  return content.split(/\r?\n/).filter(Boolean).slice(0, 24);
}

function toSet(items: string[]) {
  return new Set(items.map((item) => item.trim()).filter(Boolean));
}

function highlightDiff(left: ResumeVersionRecord, right: ResumeVersionRecord) {
  const leftNotes = toSet(left.comparisonNotes);
  const rightNotes = toSet(right.comparisonNotes);

  return {
    onlyLeft: [...leftNotes].filter((note) => !rightNotes.has(note)).slice(0, 3),
    onlyRight: [...rightNotes].filter((note) => !leftNotes.has(note)).slice(0, 3),
    scoreDelta:
      typeof left.score === "number" && typeof right.score === "number"
        ? right.score - left.score
        : null,
  };
}

export function VersionCompare({
  left,
  right,
}: {
  left: ResumeVersionRecord;
  right: ResumeVersionRecord;
}) {
  const diff = highlightDiff(left, right);

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-white to-slate-50">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <div>
            <p className="text-sm text-slate-500">Comparing</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
              {left.name} vs {right.name}
            </h3>
          </div>
          <div className="rounded-2xl bg-slate-900 px-4 py-3 text-center text-white">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Score Delta</p>
            <p className="mt-2 text-2xl font-semibold">
              {diff.scoreDelta === null ? "N/A" : `${diff.scoreDelta > 0 ? "+" : ""}${diff.scoreDelta}`}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Only in left</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {diff.onlyLeft.length > 0 ? diff.onlyLeft.map((note) => <Badge key={note}>{note}</Badge>) : <span className="text-sm text-slate-500">No unique notes</span>}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Only in right</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {diff.onlyRight.length > 0 ? diff.onlyRight.map((note) => <Badge key={note}>{note}</Badge>) : <span className="text-sm text-slate-500">No unique notes</span>}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        {[left, right].map((version, index) => (
          <Card key={version.id} className="overflow-hidden p-0">
            <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    {index === 0 ? "Left Version" : "Right Version"}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-950">{version.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{version.summary}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge>{version.type}</Badge>
                  {typeof version.score === "number" ? <Badge className="bg-slate-900 text-white">{version.score}/100</Badge> : null}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                <span>Saved {formatDate(version.createdAt)}</span>
                <span>•</span>
                <span>{lines(version.content).length} preview lines</span>
              </div>
            </div>
            <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
              <p className="text-sm font-medium text-slate-800">What changed</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {version.comparisonNotes.length > 0 ? (
                  version.comparisonNotes.slice(0, 4).map((note) => (
                    <Badge key={note} className="bg-sky-50 text-sky-700">
                      {note}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">No comparison notes yet.</span>
                )}
              </div>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap px-5 py-5 font-mono text-xs leading-6 text-slate-700 sm:px-6">
              {lines(version.content).join("\n")}
            </pre>
          </Card>
        ))}
      </div>
    </div>
  );
}
