import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { generateRoomCode } from "@/lib/room-code";
import { ROOM_CODE_TTL_MINUTES, type Room } from "@/lib/room";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard · Feedblick Pomodoro" }],
  }),
  component: Dashboard,
});

// Retries a couple of times on a unique-code collision (very unlikely at 32^6 codes, but
// cheap to guard against) rather than trusting a single random draw.
async function createRoom(teacherId: string): Promise<Room> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const { data, error } = await supabase
      .from("rooms")
      .insert({
        teacher_id: teacherId,
        code,
        code_expires_at: new Date(Date.now() + ROOM_CODE_TTL_MINUTES * 60_000).toISOString(),
      })
      .select()
      .single();
    if (!error) return data;
    if (error.code !== "23505") throw error;
  }
  throw new Error("Could not generate a unique room code — try again.");
}

function Dashboard() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    supabase
      .from("rooms")
      .select("*")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setRooms(data ?? []);
        setLoading(false);
      });
  }, [user.id]);

  const onSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const onCreateRoom = async () => {
    setCreating(true);
    try {
      const room = await createRoom(user.id);
      navigate({ to: "/rooms/$roomId", params: { roomId: room.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create room.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <BrandMark />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={onSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Your rooms</h1>
          <Button onClick={onCreateRoom} disabled={creating}>
            {creating ? "Creating…" : "New room"}
          </Button>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {!loading && rooms.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No rooms yet. Create one to get a join code for your students.
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {rooms.map((room) => (
            <Link key={room.id} to="/rooms/$roomId" params={{ roomId: room.id }}>
              <Card className="hover:border-primary transition-colors">
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-mono text-lg tracking-widest">{room.code}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(room.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={
                      room.status === "active"
                        ? "text-xs font-medium text-primary"
                        : "text-xs font-medium text-muted-foreground"
                    }
                  >
                    {room.status === "active" ? "Active" : "Ended"}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
