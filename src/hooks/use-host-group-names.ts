import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { HostGroupName } from "@/lib/room";

// A host's custom group names (src/lib/host-groups.ts's resolveGroupSet consumes these). No
// realtime subscription — this table is only ever edited on /account, disjoint from any live
// room; a host renaming a group mid-class propagates on next page load, not live. Stated scope
// limit (see the migration's own comment), not an oversight.
export function useHostGroupNames(teacherId: string | undefined) {
  const [groups, setGroups] = useState<HostGroupName[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    if (!teacherId) return;
    supabase
      .from("host_group_names")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("position")
      .then(({ data }) => {
        setGroups(data ?? []);
        setLoading(false);
      });
  }, [teacherId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { groups, loading, refetch };
}
