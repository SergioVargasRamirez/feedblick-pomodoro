import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BrandMark } from "@/components/BrandMark";
import { BackgroundGlow } from "@/components/BackgroundGlow";
import { Footer } from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Trash2, UserRound, ChevronDown, LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateRoomCode } from "@/lib/room-code";
import type { Room } from "@/lib/room";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { checkIsAdmin } from "@/lib/admin.functions";

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
      .insert({ teacher_id: teacherId, code })
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
  const checkAdmin = useServerFn(checkIsAdmin);
  const { data: adminCheck } = useQuery({
    queryKey: ["admin", "check"],
    queryFn: () => checkAdmin({}),
  });

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

  const onDeleteRoom = async (id: string) => {
    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (error) toast.error(error.message);
    else setRooms((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="relative isolate min-h-screen bg-background">
      <BackgroundGlow />
      <Toaster />
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <BrandMark />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1">
                  <UserRound className="size-4" />
                  <span className="hidden sm:inline max-w-[12rem] truncate">{user.email}</span>
                  <ChevronDown className="size-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {adminCheck?.isAdmin && (
                  <Link to="/admin">
                    <DropdownMenuItem className="cursor-pointer">
                      <ShieldCheck className="size-4" /> Admin
                    </DropdownMenuItem>
                  </Link>
                )}
                <Link to="/account">
                  <DropdownMenuItem className="cursor-pointer">
                    <UserRound className="size-4" /> Account
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={onSignOut}>
                  <LogOut className="size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
              No rooms yet. Create one to get a join code for your team — a room stays joinable
              until you end it, so it's fine to create one well ahead of time.
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {rooms.map((room) => (
            <Card key={room.id} className="hover:border-primary transition-colors">
              <CardContent className="py-4 flex items-center justify-between gap-3">
                <Link
                  to="/rooms/$roomId"
                  params={{ roomId: room.id }}
                  className="min-w-0 flex-1 space-y-0.5"
                >
                  <p className="font-medium truncate">{room.name || "Untitled room"}</p>
                  <p className="font-mono text-sm tracking-widest text-muted-foreground">
                    {room.code}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(room.created_at).toLocaleString()}
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={
                      room.status === "active"
                        ? "text-xs font-medium text-primary"
                        : "text-xs font-medium text-muted-foreground"
                    }
                  >
                    {room.status === "active" ? "Active" : "Ended"}
                  </span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this room?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This permanently deletes "{room.name || room.code}" and its to-do list.
                          This can't be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDeleteRoom(room.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <Footer variant="minimal" />
    </div>
  );
}
