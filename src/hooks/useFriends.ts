import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface FriendEntry {
  friendship_id: string;
  user_id: string;
  username: string;
}

export interface PendingRequest {
  friendship_id: string;
  user_id: string;
  username: string;
  direction: 'incoming' | 'outgoing';
}

export interface UseFriendsReturn {
  friends: FriendEntry[];
  pending: PendingRequest[];
  incomingCount: number;
  loading: boolean;
  sendRequest: (username: string) => Promise<string | null>;
  acceptRequest: (friendshipId: string) => Promise<void>;
  declineRequest: (friendshipId: string) => Promise<void>;
  removeFriend: (friendshipId: string) => Promise<void>;
  reload: () => Promise<void>;
}

export function useFriends(myUserId: string | undefined): UseFriendsReturn {
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!myUserId) { setFriends([]); setPending([]); return; }
    setLoading(true);

    const { data: friendships } = await supabase
      .from('friendships')
      .select('id, requester_id, addressee_id, status')
      .or(`requester_id.eq.${myUserId},addressee_id.eq.${myUserId}`)
      .in('status', ['pending', 'accepted']);

    if (!friendships || friendships.length === 0) {
      setFriends([]);
      setPending([]);
      setLoading(false);
      return;
    }

    // Collect all other user IDs and fetch their profiles
    const otherIds = [...new Set(
      friendships.map(f =>
        f.requester_id === myUserId ? f.addressee_id : f.requester_id
      )
    )];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', otherIds);

    const profileMap = new Map((profiles ?? []).map(p => [p.id, p.username]));

    const newFriends: FriendEntry[] = [];
    const newPending: PendingRequest[] = [];

    for (const f of friendships) {
      const isRequester = f.requester_id === myUserId;
      const otherId = isRequester ? f.addressee_id : f.requester_id;
      const username = profileMap.get(otherId) ?? 'Unknown';

      if (f.status === 'accepted') {
        newFriends.push({ friendship_id: f.id, user_id: otherId, username });
      } else if (f.status === 'pending') {
        newPending.push({
          friendship_id: f.id,
          user_id: otherId,
          username,
          direction: isRequester ? 'outgoing' : 'incoming',
        });
      }
    }

    setFriends(newFriends);
    setPending(newPending);
    setLoading(false);
  }, [myUserId]);

  useEffect(() => { load(); }, [load]);

  const sendRequest = useCallback(async (username: string): Promise<string | null> => {
    if (!myUserId) return 'Not logged in';

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (!profile) return 'User not found';
    if (profile.id === myUserId) return "You can't add yourself";

    const { error } = await supabase
      .from('friendships')
      .insert({ requester_id: myUserId, addressee_id: profile.id });

    if (error) {
      if (error.code === '23505') return 'Friend request already sent or already friends';
      return error.message;
    }

    await load();
    return null;
  }, [myUserId, load]);

  const acceptRequest = useCallback(async (friendshipId: string) => {
    await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);
    await load();
  }, [load]);

  // Decline = delete the row entirely so it can be re-sent later
  const declineRequest = useCallback(async (friendshipId: string) => {
    await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);
    await load();
  }, [load]);

  const removeFriend = useCallback(async (friendshipId: string) => {
    await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);
    await load();
  }, [load]);

  const incomingCount = pending.filter(p => p.direction === 'incoming').length;

  return {
    friends, pending, incomingCount, loading,
    sendRequest, acceptRequest, declineRequest, removeFriend,
    reload: load,
  };
}
