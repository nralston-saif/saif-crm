import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

// Create the Liveblocks client
const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!,
});

// Presence represents the user's current state
type Presence = {
  cursor: { x: number; y: number } | null;
  name: string;
  isTyping: boolean;
};

// Storage represents the shared state
type Storage = {
  draft: string;
};

// User metadata
type UserMeta = {
  id: string;
  info: {
    name: string;
    color: string;
  };
};

// Room event types (if needed)
type RoomEvent = {};

// Thread metadata (if needed)
type ThreadMetadata = {};

// Create the room context with types
const roomContext = createRoomContext<Presence, Storage, UserMeta, RoomEvent, ThreadMetadata>(client);

export const {
  suspense: {
    RoomProvider,
    useRoom,
    useMyPresence,
    useUpdateMyPresence,
    useOthers,
    useOthersMapped,
    useSelf,
    useStorage,
    useMutation,
    useStatus,
  },
} = roomContext;

// Export ClientSideSuspense for wrapping suspense components
export { ClientSideSuspense } from "@liveblocks/react";
