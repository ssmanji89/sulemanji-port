export type CalendarFetch = typeof fetch;

export interface CalendarConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export interface CalendarWindow {
  startsAt: string;
  endsAt: string;
}

export interface FreeBusyRequest {
  calendarId: string;
  startsAt: string;
  endsAt: string;
}

export interface AvailabilityRequest {
  calendarId: string;
  durationMinutes: number;
  from: string;
  to: string;
}

export interface SessionEventRequest extends FreeBusyRequest {
  summary: string;
  description: string;
}

export interface CalendarAdapter {
  listAvailability(request: AvailabilityRequest): Promise<CalendarWindow[]>;
  isFree(request: FreeBusyRequest): Promise<boolean>;
  createSessionEvent(
    request: SessionEventRequest,
  ): Promise<{ providerEventId: string }>;
}

export const createGoogleCalendarAdapter = (
  config: CalendarConfig,
  calendarFetch: CalendarFetch = fetch,
): CalendarAdapter => new GoogleCalendarAdapter(config, calendarFetch);

class GoogleCalendarAdapter implements CalendarAdapter {
  private accessToken: string | null = null;
  private expiresAt = 0;

  constructor(
    private readonly config: CalendarConfig,
    private readonly calendarFetch: CalendarFetch,
  ) {}

  async listAvailability(
    request: AvailabilityRequest,
  ): Promise<CalendarWindow[]> {
    const busy = await this.busyBlocks({
      calendarId: request.calendarId,
      startsAt: request.from,
      endsAt: request.to,
    });
    const windows: CalendarWindow[] = [];
    const durationMs = request.durationMinutes * 60_000;
    const cursor = new Date(request.from);
    const end = new Date(request.to);

    cursor.setUTCMinutes(0, 0, 0);
    if (cursor < new Date(request.from)) cursor.setUTCHours(cursor.getUTCHours() + 1);

    while (cursor.getTime() + durationMs <= end.getTime() && windows.length < 12) {
      const startsAt = cursor.toISOString();
      const endsAt = new Date(cursor.getTime() + durationMs).toISOString();
      if (!overlapsBusy(startsAt, endsAt, busy)) {
        windows.push({ startsAt, endsAt });
      }
      cursor.setUTCHours(cursor.getUTCHours() + 1);
    }

    return windows;
  }

  async isFree(request: FreeBusyRequest): Promise<boolean> {
    return !(await this.busyBlocks(request)).some((busy) =>
      overlaps(request.startsAt, request.endsAt, busy.start, busy.end),
    );
  }

  async createSessionEvent(
    request: SessionEventRequest,
  ): Promise<{ providerEventId: string }> {
    const response = await this.calendarJson<{ id?: string }>(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        request.calendarId,
      )}/events`,
      {
        method: "POST",
        body: JSON.stringify({
          summary: request.summary,
          description: request.description,
          start: { dateTime: request.startsAt },
          end: { dateTime: request.endsAt },
        }),
      },
    );

    if (!response.id) {
      throw new Error("Calendar event did not include an id");
    }
    return { providerEventId: response.id };
  }

  private async busyBlocks(
    request: FreeBusyRequest,
  ): Promise<Array<{ start: string; end: string }>> {
    const response = await this.calendarJson<{
      calendars?: Record<string, { busy?: Array<{ start: string; end: string }> }>;
    }>("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      body: JSON.stringify({
        timeMin: request.startsAt,
        timeMax: request.endsAt,
        items: [{ id: request.calendarId }],
      }),
    });

    return response.calendars?.[request.calendarId]?.busy ?? [];
  }

  private async calendarJson<T = unknown>(
    url: string,
    init: RequestInit = {},
  ): Promise<T> {
    const token = await this.token();
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${token}`);
    if (init.body) headers.set("content-type", "application/json");

    const response = await this.calendarFetch(url, { ...init, headers });
    if (!response.ok) {
      throw new Error(`Calendar request failed: ${response.status}`);
    }
    if (response.status === 204) return undefined as T;
    return response.json<T>();
  }

  private async token(): Promise<string> {
    if (this.accessToken && Date.now() < this.expiresAt) {
      return this.accessToken;
    }

    const response = await this.calendarFetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: this.config.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!response.ok) {
      throw new Error(`Calendar token refresh failed: ${response.status}`);
    }

    const body = await response.json<{ access_token: string; expires_in?: number }>();
    this.accessToken = body.access_token;
    this.expiresAt = Date.now() + ((body.expires_in ?? 3600) - 60) * 1000;
    return this.accessToken;
  }
}

const overlapsBusy = (
  startsAt: string,
  endsAt: string,
  busy: Array<{ start: string; end: string }>,
): boolean => busy.some((block) => overlaps(startsAt, endsAt, block.start, block.end));

const overlaps = (
  startsAt: string,
  endsAt: string,
  busyStart: string,
  busyEnd: string,
): boolean =>
  new Date(startsAt) < new Date(busyEnd) &&
  new Date(endsAt) > new Date(busyStart);
