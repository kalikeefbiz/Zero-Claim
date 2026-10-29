export interface RecordData {
  wins: number;
  losses: number;
  best: number;
  played: number;
  sound: boolean;
  tutorial: boolean;
}
export const freshRecord = (): RecordData => ({
  wins: 0,
  losses: 0,
  best: 0,
  played: 0,
  sound: true,
  tutorial: false,
});
const KEY = "blackhouse.zero-claim.v1";
export function loadRecord(): RecordData {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "{}");
    const record = freshRecord();
    for (const key of ["wins", "losses", "best", "played"] as const)
      if (Number.isSafeInteger(data[key]) && data[key] >= 0)
        record[key] = data[key];
    if (typeof data.sound === "boolean") record.sound = data.sound;
    if (typeof data.tutorial === "boolean") record.tutorial = data.tutorial;
    return record;
  } catch {
    return freshRecord();
  }
}
export function saveRecord(record: RecordData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    /* Private mode and full storage still allow play. */
  }
}
