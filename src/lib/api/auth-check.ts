import { createLogger } from '@/lib/api/logger';
import { getDatabases } from '@/lib/api/appwrite-admin';
import { DATABASE_ID, EVENTS_COLLECTION_ID, MEMBERS_COLLECTION_ID } from '@/lib/constants/collections';

const log = createLogger({ action: 'auth-check' });

export async function isUserChairOfEvent(userId: string, eventId: string): Promise<boolean> {
  try {
    const db = getDatabases();

    const member = await db.getDocument(
      DATABASE_ID!,
      MEMBERS_COLLECTION_ID!,
      userId
    );
    const memberTeams = (member.teams || []) as string[];

    const event = await db.getDocument(
      DATABASE_ID!,
      EVENTS_COLLECTION_ID!,
      eventId
    );
    const eventTeamId = (event as any).team_id as string;

    if (!eventTeamId) {
      log.warn('Event has no team_id', { eventId });
      return false;
    }

    return memberTeams.some(team => team.startsWith(eventTeamId));
  } catch (error) {
    log.error('Error checking if user is chair of event', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}


