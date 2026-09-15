/**
 * Realtime channels for the Lyrics OBS tool, namespaced by Broadcast ID.
 *
 * The room is the primary session boundary: two Broadcast IDs never share a
 * channel, so their items, Next/Prev, Lock, Clear, Auto, Preview, settings and
 * monitor state stay completely separate. A hostname segment is kept as a
 * secondary guard so dev and production can't collide even on the same ID, and
 * so a lyrics broadcast can never reach bible-obs:*.
 *
 * There is deliberately no room-less channel — without a Broadcast ID there is
 * nothing to join, and the caller shows the room screen instead of falling back
 * to a shared global channel.
 */
function host(): string {
  return typeof window === "undefined" ? "server" : window.location.hostname
}

export function lyricsChannelName(roomId: string): string {
  return `lyrics-obs:${host()}:${roomId}`
}

/**
 * The read-only monitor's channel for a room. The display never subscribes to
 * it, so a monitor — however widely its link is shared — shares no channel with
 * the on-screen output and cannot move it. A monitor in one room never sees
 * another: the room is part of the channel name.
 */
export function monitorChannelName(roomId: string): string {
  return `${lyricsChannelName(roomId)}:monitor`
}

/**
 * Presence + controller-ownership channel for a room. Every surface (dock,
 * display, monitor) joins it to appear in the participant list, but it carries
 * only presence and controller claims — never item/clear/lock — so a monitor
 * joining it still can't touch the on-screen output. Scoped by room, so one
 * Broadcast ID never sees another's participants or controller.
 */
export function presenceChannelName(roomId: string): string {
  return `${lyricsChannelName(roomId)}:presence`
}
