export type DocumentPatch = Record<string, unknown>;
export type DocumentWriter = (patch: DocumentPatch, expectedRevision: number) => Promise<number>;

export class DocumentSaveQueue {
  private revision: number;
  private pending: DocumentPatch = {};
  private active: Promise<void> | null = null;

  constructor(initialRevision: number, private readonly write: DocumentWriter) {
    this.revision = initialRevision;
  }

  get hasPendingChanges() {
    return this.active !== null || Object.keys(this.pending).length > 0;
  }

  get currentRevision() {
    return this.revision;
  }

  enqueue(patch: DocumentPatch) {
    this.pending = { ...this.pending, ...patch };
  }

  async flush(): Promise<void> {
    if (this.active) {
      await this.active;
      if (Object.keys(this.pending).length > 0) return this.flush();
      return;
    }
    if (Object.keys(this.pending).length === 0) return;

    const batch = this.pending;
    this.pending = {};
    this.active = (async () => {
      try {
        this.revision = await this.write(batch, this.revision);
      } catch (error) {
        this.pending = { ...batch, ...this.pending };
        throw error;
      } finally {
        this.active = null;
      }
    })();

    await this.active;
    if (Object.keys(this.pending).length > 0) await this.flush();
  }

  retry() {
    return this.flush();
  }
}
