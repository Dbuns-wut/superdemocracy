"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { normalizeOrgId } from "@/lib/org-id";
import type { CommunityOrg } from "@/lib/community-orgs/types";
import { OrgItemShareButton } from "@/components/OrgItemShareButton";
import { OrgSettingsPanel } from "@/components/OrgSettingsPanel";
import { PerspectivesPanel } from "@/components/PerspectivesPanel";
import { PersonPicker } from "@/components/PersonPicker";
import { AuditorVisibilityCard } from "@/components/AuditorVisibilityCard";
import { useOrgShortcutIcons } from "@/hooks/useOrgShortcutIcons";
import { useSession } from "@/lib/auth/use-session";
import { usePeople } from "@/lib/people/use-people";
import type { OrgSettings } from "@/lib/org-settings/types";
import type { VoteEducation } from "@/lib/education/types";

/** Spans for “no deadline” / open-ended polls and votes. */
const MS_OPEN_ENDED = 100 * 365.25 * 24 * 60 * 60 * 1000;

/** Pinned note from Share → Pin; must match `KIND_PIN_LABEL.event` in OrgItemShareButton. */
const PINNED_EVENT_HEAD = /^📅 Event:\s*(.+)$/;

type ParsedPinnedEvent = {
  title: string;
  url: string;
  description: string;
  shareId: string | null;
};

function parsePinnedEventNote(note: string): ParsedPinnedEvent | null {
  const lines = note.split(/\r?\n/).map((l) => l.trimEnd());
  const head = (lines[0] ?? "").trim();
  const m = head.match(PINNED_EVENT_HEAD);
  if (!m) return null;
  const title = m[1].trim();
  const url = (lines[1] ?? "").trim();
  if (!/^https?:\/\//i.test(url)) return null;
  const description = lines.slice(2).join("\n").trim();
  let shareId: string | null = null;
  try {
    const u = new URL(url);
    if (u.searchParams.get("share") === "event") {
      shareId = u.searchParams.get("shareId");
    }
  } catch {
    /* ignore */
  }
  return { title, url, description, shareId };
}

type JoinFieldAnswer = {
  fieldId: string
  label: string
  type: "text" | "file"
  value: string
}

type PendingApplicationRow = {
  id: string;
  user: string;
  message: string;
  answers?: JoinFieldAnswer[];
};

export default function OrgPage() {
  const params = useParams();
  const { account } = useSession();

  const [mounted, setMounted] = useState(false);
  const [applications, setApplications] = useState<PendingApplicationRow[]>([]);
  const [view, setView] = useState<"home" | "members" | "socials" | "polls" | "votes" | "settings">("home");
  const [membersTab, setMembersTab] = useState<"all" | "pending" | "manage">("all");
  const [membersSearch, setMembersSearch] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [socialTab, setSocialTab] = useState<"all" | "events" | "messageboard" | "votes">("all");
  const [socialSearch, setSocialSearch] = useState("");
  const [voteSearch, setVoteSearch] = useState("");
  const [postText, setPostText] = useState("");
  const [hoveredLikePostId, setHoveredLikePostId] = useState<string | null>(null);
  const [posts, setPosts] = useState<
    {
      id: string;
      user: string;
      org: string;
      text: string;
      timestamp: number;
      reactions?: { like?: string[]; love?: string[]; laugh?: string[]; disagree?: string[] };
    }[]
  >([]);
  const [events, setEvents] = useState<
    { id: string; title: string; eventDate: string; description: string; createdAt: number }[]
  >([]);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [showCreateEventForm, setShowCreateEventForm] = useState(false);
  const [polls, setPolls] = useState<
    {
      id: string;
      orgId: string;
      title: string;
      description: string;
      options: string[];
      type: "single" | "multi";
      startTime: number;
      endTime: number;
      createdAt: number;
      tally: number[];
      totalVotes: number;
      currentUserChoices: number[] | null;
    }[]
  >([]);
  /** Local selection overlay while editing; falls back to `currentUserChoices` from API when unset. */
  const [pollVotes, setPollVotes] = useState<Record<string, number[]>>({});
  const [pollTitle, setPollTitle] = useState("");
  const [pollDescription, setPollDescription] = useState("");
  const [pollType, setPollType] = useState<"single" | "multi">("single");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollStart, setPollStart] = useState("");
  const [pollEnd, setPollEnd] = useState("");
  const [pollDeadlineChoice, setPollDeadlineChoice] = useState<"unset" | "yes" | "no">("unset");
  const [pollStatus, setPollStatus] = useState<string | null>(null);
  const [showCreatePollForm, setShowCreatePollForm] = useState(false);
  /** Poll card ⋯ menu: hover shows panel; click pins until outside click or Escape. */
  const [pollDetailsHoverId, setPollDetailsHoverId] = useState<string | null>(null);
  const [pollDetailsPinnedId, setPollDetailsPinnedId] = useState<string | null>(null);
  const [communityVotes, setCommunityVotes] = useState<
    {
      id: string;
      orgId: string;
      title: string;
      description: string;
      options: string[];
      startTime: number;
      endTime: number;
      eligibleVoters: string[];
      allowVoteChange: boolean;
      status: string;
      createdAt: number;
      tally: number[] | null;
      totalBallots: number | null;
      mySubmission?: { choices: number[] | null; timestamp: number | null; linked: boolean } | null;
    }[]
  >([]);
  const [voteChoices, setVoteChoices] = useState<Record<string, number[]>>({});
  const [voteTitle, setVoteTitle] = useState("");
  const [voteDescription, setVoteDescription] = useState("");
  const [voteOptions, setVoteOptions] = useState<string[]>(["", ""]);
  const [voteStart, setVoteStart] = useState("");
  const [voteEnd, setVoteEnd] = useState("");
  const [allowVoteChange, setAllowVoteChange] = useState(false);
  const [voteStatus, setVoteStatus] = useState<string | null>(null);
  const [showCreateVoteForm, setShowCreateVoteForm] = useState(false);
  const [auditorInput, setAuditorInput] = useState<string | null>(null);
  const [auditorBusy, setAuditorBusy] = useState(false);
  const [auditorError, setAuditorError] = useState("");
  const [auditorReveal, setAuditorReveal] = useState<{
    voteId: string;
    title: string;
    options: string[];
    ballots: { voterId: string; choices: number[]; timestamp: number }[];
  } | null>(null);
  const [manageSearch, setManageSearch] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitee, setInvitee] = useState<string | null>(null);
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [applicationError, setApplicationError] = useState("");
  const [membersNotice, setMembersNotice] = useState("");
  const [messageboardMutes, setMessageboardMutes] = useState<
    { user: string; mutedUntil: number }[]
  >([]);
  const [viewerMessageboardMutedUntil, setViewerMessageboardMutedUntil] = useState<
    number | null
  >(null);
  const [muteMemberModal, setMuteMemberModal] = useState<string | null>(null);
  const [mutePreset, setMutePreset] = useState<"1h" | "24h" | "7d" | "30d" | "custom">(
    "24h"
  );
  const [muteCustomHours, setMuteCustomHours] = useState("24");
  const [muteSaving, setMuteSaving] = useState(false);
  const [showSocialSort, setShowSocialSort] = useState(false);
  const [socialSortOrder, setSocialSortOrder] = useState<"recent" | "popular" | "newest" | "oldest">("recent");
  const [socialInteractionRecency, setSocialInteractionRecency] = useState<Record<string, number>>({});
  const [orgDisplayName, setOrgDisplayName] = useState<string>("");
  const [orgRecord, setOrgRecord] = useState<CommunityOrg | null>(null);
  const [orgLoad, setOrgLoad] = useState<"idle" | "loading" | "ok" | "missing">("idle");
  const [orgHomeBannerUrl, setOrgHomeBannerUrl] = useState("");
  const [orgHomeProfileLogoUrl, setOrgHomeProfileLogoUrl] = useState("");
  const [orgProfileLogoDragActive, setOrgProfileLogoDragActive] = useState(false);
  const profileLogoFileInputRef = useRef<HTMLInputElement>(null);
  const [profileLogoCueOpen, setProfileLogoCueOpen] = useState(false);
  const [orgHomeBannerDragActive, setOrgHomeBannerDragActive] = useState(false);
  const [showBannerEditor, setShowBannerEditor] = useState(false);
  const [bannerEditorSource, setBannerEditorSource] = useState("");
  const [bannerEditorScale, setBannerEditorScale] = useState(1);
  const [bannerEditorOffset, setBannerEditorOffset] = useState({ x: 0, y: 0 });
  const [bannerEditorDragging, setBannerEditorDragging] = useState(false);
  const [bannerEditorDragStart, setBannerEditorDragStart] = useState({ x: 0, y: 0 });
  const [orgHomePinnedNotes, setOrgHomePinnedNotes] = useState<string[]>([]);
  const [orgHomeNoteDraft, setOrgHomeNoteDraft] = useState("");
  const [showCodeOfConductModal, setShowCodeOfConductModal] = useState(false);
  const [codeOfConductText, setCodeOfConductText] = useState("");
  const [codeOfConductDocName, setCodeOfConductDocName] = useState("");
  const [codeOfConductDocDataUrl, setCodeOfConductDocDataUrl] = useState("");
  const [codeOfConductDraftText, setCodeOfConductDraftText] = useState("");
  const [codeOfConductDraftDocName, setCodeOfConductDraftDocName] = useState("");
  const [codeOfConductDraftDocDataUrl, setCodeOfConductDraftDocDataUrl] = useState("");
  const [codeOfConductDocDragActive, setCodeOfConductDocDragActive] = useState(false);
  const [codeOfConductAdminEditing, setCodeOfConductAdminEditing] = useState(false);
  const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null);
  const [perspectivesVoteId, setPerspectivesVoteId] = useState<string | null>(null);
  const [voteEducation, setVoteEducation] = useState<VoteEducation | null>(null);
  const [voteEducationLoading, setVoteEducationLoading] = useState(false);
  const [communityEduAck, setCommunityEduAck] = useState<Record<string, boolean>>({});

  const codeOfConductHasSavedContent = useMemo(
    () => Boolean(codeOfConductText.trim() || codeOfConductDocDataUrl),
    [codeOfConductText, codeOfConductDocDataUrl]
  );

  const orgParam = params?.orgId as string;

  const userId = account?.id ?? null;
  const orgId = normalizeOrgId(orgParam ?? "");
  const orgKey = orgId;
  const isGovernance = orgRecord?.kind === "governance";

  const fallbackOrgName = orgId ? `Organization ${orgId.slice(0, 8)}…` : "Organization";

  const isAdmin = Boolean(orgRecord && userId && userId.toLowerCase() === orgRecord.creatorId.toLowerCase());

  const isDesignatedAuditor = Boolean(
    userId &&
      orgRecord?.auditorId &&
      userId.toLowerCase() === orgRecord.auditorId.toLowerCase() &&
      userId.toLowerCase() !== orgRecord.creatorId.toLowerCase()
  );

  const canInviteMembers = useMemo(
    () => isAdmin && orgRecord?.membershipMode === "Manual",
    [isAdmin, orgRecord?.membershipMode]
  );

  /** URL segment for `/orgs/[orgId]` share links (matches the address bar). */
  const shareOrgSlug = orgParam ?? "";

  const pinContentToOrgHome = useCallback((note: string) => {
    const n = note.trim();
    if (!n || !orgKey) return;
    setOrgHomePinnedNotes((prev) => [n, ...prev]);
  }, [orgKey]);

  useOrgShortcutIcons(orgHomeProfileLogoUrl, mounted && !!orgKey);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!pollDetailsPinnedId) return;
    const pinned = pollDetailsPinnedId;
    const onMouseDown = (e: MouseEvent) => {
      const node = e.target as Node;
      const sel = `[data-poll-details-root="${CSS.escape(pinned)}"]`;
      const menuRoot = document.querySelector(sel);
      if (menuRoot?.contains(node)) return;
      setPollDetailsPinnedId(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPollDetailsPinnedId(null);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [pollDetailsPinnedId]);

  useEffect(() => {
    if (!orgId) {
      setOrgRecord(null);
      setOrgLoad("idle");
      return;
    }
    setOrgLoad("loading");
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/community-orgs/${orgId}`, { credentials: "include" });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setOrgRecord(data.org);
          setOrgDisplayName(data.org?.title ?? "");
          setOrgLoad("ok");
        } else {
          setOrgRecord(null);
          setOrgLoad("missing");
        }
      } catch {
        if (!cancelled) {
          setOrgRecord(null);
          setOrgLoad("missing");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  useEffect(() => {
    if (!mounted || !orgId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/community-orgs/${encodeURIComponent(orgId)}/members`, {
          credentials: "include",
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.members)) {
          setMembers(data.members);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mounted, orgId, userId]);

  useEffect(() => {
    if (!mounted) return;

    const fetchApps = async () => {
      const rows: PendingApplicationRow[] = [];
      if (orgId && isAdmin && orgRecord?.membershipMode === "Manual") {
        try {
          const res = await fetch(
            `/api/community-applications?orgId=${encodeURIComponent(orgId)}&status=pending`,
            { credentials: "include" }
          );
          if (res.ok) {
            const data = await res.json();
            const apps = data.applications ?? [];
            rows.push(
              ...apps.map(
                (a: { id: string; user: string; message: string; answers?: JoinFieldAnswer[] }) => ({
                  id: a.id,
                  user: a.user,
                  message: a.message,
                  answers: Array.isArray(a.answers) ? a.answers : [],
                })
              )
            );
          }
        } catch (err) {
          console.error("Failed to fetch applications", err);
        }
      }
      setApplications(rows);
    };

    fetchApps();
  }, [mounted, orgId, isAdmin, orgRecord?.membershipMode]);

  useEffect(() => {
    if (!orgKey) return;
    let cancelled = false;
    ;(async () => {
      try {
        const res = await fetch(`/api/org-settings/${encodeURIComponent(orgKey)}`);
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && data.settings) {
          setOrgSettings(data.settings);
        }
      } catch {
        /* keep defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgKey]);



  const isViewerMember = Boolean(
    userId &&
      (members.some((m) => m.toLowerCase() === userId.toLowerCase()) ||
        (orgRecord && orgRecord.creatorId.toLowerCase() === userId.toLowerCase()))
  );

  const peopleIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of members) ids.add(m);
    for (const a of applications) ids.add(a.user);
    for (const p of posts) ids.add(p.user);
    for (const b of auditorReveal?.ballots ?? []) ids.add(b.voterId);
    if (orgRecord?.auditorId) ids.add(orgRecord.auditorId);
    if (orgRecord?.creatorId) ids.add(orgRecord.creatorId);
    return Array.from(ids);
  }, [members, applications, posts, auditorReveal, orgRecord?.auditorId, orgRecord?.creatorId]);
  const { nameOf } = usePeople(peopleIds);

  const filteredMembers = members.filter((m) =>
    nameOf(m).toLowerCase().includes(membersSearch.toLowerCase())
  );

  const muteByMemberLower = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of messageboardMutes) {
      m.set(row.user.toLowerCase(), row.mutedUntil);
    }
    return m;
  }, [messageboardMutes]);

  const loadMessageboardMuteState = useCallback(async () => {
    if (!orgKey) return;
    try {
      const qs = new URLSearchParams({ orgKey });
      const res = await fetch(`/api/messageboard-mutes?${qs.toString()}`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.mutes)) setMessageboardMutes(data.mutes);
      setViewerMessageboardMutedUntil(
        typeof data.viewerMutedUntil === "number" ? data.viewerMutedUntil : null
      );
    } catch {
      /* ignore */
    }
  }, [orgKey]);

  useEffect(() => {
    if (!mounted || !orgKey) return;
    // userId is a dependency on purpose: the viewer's own mute state comes from the session.
    loadMessageboardMuteState();
  }, [mounted, orgKey, userId, loadMessageboardMuteState]);

  useEffect(() => {
    if (socialTab !== "messageboard" || !orgKey) return;
    loadMessageboardMuteState();
  }, [socialTab, orgKey, loadMessageboardMuteState]);


  useEffect(() => {
    if (!mounted || !orgKey) return;

    const fetchPosts = async () => {
      try {
        const res = await fetch(
          `/api/messageboard-proxy?org=${encodeURIComponent(orgKey)}`
        );
        const data = await res.json().catch(() => []);
        setPosts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch messageboard posts", err);
      }
    };

    fetchPosts();
  }, [mounted, orgKey]);

  useEffect(() => {
    if (!orgKey) return;
    try {
      const raw = localStorage.getItem(`org-events:${orgKey.toLowerCase()}`);
      const parsed = raw ? JSON.parse(raw) : [];
      setEvents(Array.isArray(parsed) ? parsed : []);
    } catch {
      setEvents([]);
    }
  }, [orgKey]);

  useEffect(() => {
    if (!orgKey) return;
    localStorage.setItem(`org-events:${orgKey.toLowerCase()}`, JSON.stringify(events));
  }, [events, orgKey]);

  useEffect(() => {
    if (!orgKey) return;
    try {
      const raw = localStorage.getItem(`org-home:${orgKey.toLowerCase()}`);
      const parsed = raw ? JSON.parse(raw) : {};
      setOrgHomeBannerUrl(typeof parsed.bannerUrl === "string" ? parsed.bannerUrl : "");
      setOrgHomeProfileLogoUrl(typeof parsed.profileLogoUrl === "string" ? parsed.profileLogoUrl : "");
      setOrgHomePinnedNotes(
        Array.isArray(parsed.pinnedNotes)
          ? parsed.pinnedNotes.filter((n: unknown) => typeof n === "string" && n.trim().length > 0)
          : []
      );
      setCodeOfConductText(typeof parsed.codeOfConductText === "string" ? parsed.codeOfConductText : "");
      setCodeOfConductDocName(typeof parsed.codeOfConductDocName === "string" ? parsed.codeOfConductDocName : "");
      setCodeOfConductDocDataUrl(
        typeof parsed.codeOfConductDocDataUrl === "string" ? parsed.codeOfConductDocDataUrl : ""
      );
    } catch {
      setOrgHomeBannerUrl("");
      setOrgHomeProfileLogoUrl("");
      setOrgHomePinnedNotes([]);
      setCodeOfConductText("");
      setCodeOfConductDocName("");
      setCodeOfConductDocDataUrl("");
    }
  }, [orgKey]);

  useEffect(() => {
    if (!orgKey) return;
    localStorage.setItem(
      `org-home:${orgKey.toLowerCase()}`,
      JSON.stringify({
        bannerUrl: orgHomeBannerUrl.trim(),
        profileLogoUrl: orgHomeProfileLogoUrl.trim(),
        pinnedNotes: orgHomePinnedNotes,
        codeOfConductText,
        codeOfConductDocName,
        codeOfConductDocDataUrl,
      })
    );
  }, [
    orgHomeBannerUrl,
    orgHomeProfileLogoUrl,
    orgHomePinnedNotes,
    codeOfConductText,
    codeOfConductDocName,
    codeOfConductDocDataUrl,
    orgKey,
  ]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setProfileLogoCueOpen(false);
      if (showBannerEditor) setShowBannerEditor(false);
      if (showCodeOfConductModal) {
        setShowCodeOfConductModal(false);
        setCodeOfConductAdminEditing(false);
      }
      if (showSocialSort) setShowSocialSort(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showBannerEditor, showCodeOfConductModal, showSocialSort]);

  const reloadPolls = useCallback(async () => {
    if (!orgKey) return;
    try {
      const q = new URLSearchParams({ orgId: orgKey });
      const res = await fetch(`/api/polls?${q.toString()}`, { credentials: "include" });
      const data = await res.json();
      setPolls(Array.isArray(data?.polls) ? data.polls : []);
    } catch (err) {
      console.error("Failed to fetch polls", err);
      setPolls([]);
    }
  }, [orgKey]);

  useEffect(() => {
    if (!mounted || !orgKey) return;
    // Re-fetch when the signed-in person changes so `currentUserChoices` is theirs.
    void reloadPolls();
  }, [mounted, orgKey, userId, reloadPolls]);

  const reloadCommunityVotes = useCallback(async () => {
    if (!orgKey) return;
    try {
      const q = new URLSearchParams({ orgId: orgKey });
      const res = await fetch(`/api/votes?${q.toString()}`, { credentials: "include" });
      const data = await res.json();
      setCommunityVotes(Array.isArray(data?.votes) ? data.votes : []);
    } catch (err) {
      console.error("Failed to fetch community votes", err);
      setCommunityVotes([]);
    }
  }, [orgKey]);

  useEffect(() => {
    if (!mounted || !orgKey) return;
    // Re-fetch when the signed-in person changes so `mySubmission` and the tally visibility are theirs.
    void reloadCommunityVotes();
  }, [mounted, orgKey, userId, reloadCommunityVotes]);

  const filteredPosts = posts.filter((post) =>
    post.text.toLowerCase().includes(socialSearch.toLowerCase())
  );

  const filteredEvents = events.filter(
    (e) =>
      e.title.toLowerCase().includes(socialSearch.toLowerCase()) ||
      e.description.toLowerCase().includes(socialSearch.toLowerCase())
  );

  const filteredPolls = polls.filter(
    (p) =>
      p.title.toLowerCase().includes(socialSearch.toLowerCase()) ||
      p.description.toLowerCase().includes(socialSearch.toLowerCase())
  );

  const filteredVotes = communityVotes.filter(
    (v) =>
      v.title.toLowerCase().includes(socialSearch.toLowerCase()) ||
      v.description.toLowerCase().includes(socialSearch.toLowerCase())
  );

  const filteredVotesForVotesTab = communityVotes.filter(
    (v) =>
      v.title.toLowerCase().includes(voteSearch.toLowerCase()) ||
      v.description.toLowerCase().includes(voteSearch.toLowerCase())
  );

  const trackSocialInteraction = useCallback((kind: "event" | "post" | "poll" | "vote", id: string) => {
    setSocialInteractionRecency((prev) => ({ ...prev, [`${kind}:${id}`]: Date.now() }));
  }, []);

  const sortedSocialAllFeed = useMemo(() => {
    const eventItems = filteredEvents.map((e) => ({ kind: "event" as const, item: e }));
    const postItems = filteredPosts.map((p) => ({ kind: "post" as const, item: p }));
    const pollItems = filteredPolls.map((p) => ({ kind: "poll" as const, item: p }));
    const voteItems = filteredVotes.map((v) => ({ kind: "vote" as const, item: v }));
    const all = [...eventItems, ...postItems, ...pollItems, ...voteItems];
    const withMeta = all.map((entry) => {
      const createdTs =
        entry.kind === "post" ? entry.item.timestamp : entry.item.createdAt;
      const key = `${entry.kind}:${entry.item.id}`;
      const recentTs = Math.max(createdTs, socialInteractionRecency[key] ?? 0);
      const interactions =
        entry.kind === "post"
          ? (entry.item.reactions?.like?.length ?? 0) +
            (entry.item.reactions?.love?.length ?? 0) +
            (entry.item.reactions?.laugh?.length ?? 0) +
            (entry.item.reactions?.disagree?.length ?? 0)
          : entry.kind === "poll"
            ? entry.item.totalVotes ?? 0
            : 0;
      return { ...entry, createdTs, recentTs, interactions };
    });

    withMeta.sort((a, b) => {
      if (socialSortOrder === "recent") return b.recentTs - a.recentTs;
      if (socialSortOrder === "popular") return b.interactions - a.interactions || b.recentTs - a.recentTs;
      if (socialSortOrder === "newest") return b.createdTs - a.createdTs;
      return a.createdTs - b.createdTs;
    });
    return withMeta;
  }, [filteredEvents, filteredPosts, filteredPolls, filteredVotes, socialInteractionRecency, socialSortOrder]);

  const sortedFilteredEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => {
      const recentA = Math.max(a.createdAt, socialInteractionRecency[`event:${a.id}`] ?? 0);
      const recentB = Math.max(b.createdAt, socialInteractionRecency[`event:${b.id}`] ?? 0);
      if (socialSortOrder === "recent") return recentB - recentA;
      if (socialSortOrder === "popular") return recentB - recentA;
      if (socialSortOrder === "newest") return b.createdAt - a.createdAt;
      return a.createdAt - b.createdAt;
    });
  }, [filteredEvents, socialInteractionRecency, socialSortOrder]);

  const sortedFilteredPosts = useMemo(() => {
    return [...filteredPosts].sort((a, b) => {
      const interactionsA =
        (a.reactions?.like?.length ?? 0) +
        (a.reactions?.love?.length ?? 0) +
        (a.reactions?.laugh?.length ?? 0) +
        (a.reactions?.disagree?.length ?? 0);
      const interactionsB =
        (b.reactions?.like?.length ?? 0) +
        (b.reactions?.love?.length ?? 0) +
        (b.reactions?.laugh?.length ?? 0) +
        (b.reactions?.disagree?.length ?? 0);
      const recentA = Math.max(a.timestamp, socialInteractionRecency[`post:${a.id}`] ?? 0);
      const recentB = Math.max(b.timestamp, socialInteractionRecency[`post:${b.id}`] ?? 0);
      if (socialSortOrder === "recent") return recentB - recentA;
      if (socialSortOrder === "popular") return interactionsB - interactionsA || recentB - recentA;
      if (socialSortOrder === "newest") return b.timestamp - a.timestamp;
      return a.timestamp - b.timestamp;
    });
  }, [filteredPosts, socialInteractionRecency, socialSortOrder]);

  const sortedFilteredVotes = useMemo(() => {
    return [...filteredVotes].sort((a, b) => {
      const recentA = Math.max(a.createdAt, socialInteractionRecency[`vote:${a.id}`] ?? 0);
      const recentB = Math.max(b.createdAt, socialInteractionRecency[`vote:${b.id}`] ?? 0);
      if (socialSortOrder === "recent") return recentB - recentA;
      if (socialSortOrder === "popular") return recentB - recentA;
      if (socialSortOrder === "newest") return b.createdAt - a.createdAt;
      return a.createdAt - b.createdAt;
    });
  }, [filteredVotes, socialInteractionRecency, socialSortOrder]);

  const openEndedLabel = (start: number, end: number) =>
    end - start >= MS_OPEN_ENDED * 0.99
      ? "No end date (open)"
      : `Ends ${new Date(end).toLocaleString()}`;

  const openEndedWindowLabel = (start: number, end: number) =>
    end - start >= MS_OPEN_ENDED * 0.99
      ? "Open (no end date)"
      : `${new Date(start).toLocaleString()} – ${new Date(end).toLocaleString()}`;

  function computeMuteDurationMs(
    preset: typeof mutePreset,
    customH: string
  ): number {
    switch (preset) {
      case "1h":
        return 60 * 60 * 1000;
      case "24h":
        return 24 * 60 * 60 * 1000;
      case "7d":
        return 7 * 24 * 60 * 60 * 1000;
      case "30d":
        return 30 * 24 * 60 * 60 * 1000;
      default: {
        const h = Math.max(1, parseInt(customH, 10) || 1);
        return h * 60 * 60 * 1000;
      }
    }
  }

  const isViewerMessageboardMuted =
    viewerMessageboardMutedUntil !== null &&
    viewerMessageboardMutedUntil > Date.now();

  const urlIsValid = !!orgId;
  const canShowMain = urlIsValid && orgLoad === "ok";
  const orgDescriptionText =
    (orgRecord?.description && orgRecord.description.trim()) ||
    "This organization has not added a description yet.";

  const handleCreateEvent = () => {
    const title = eventTitle.trim();
    const selectedDate = eventDate.trim();
    const description = eventDescription.trim();
    if (!title) return;
    const createdAt = Date.now();
    const eventId = `event-${createdAt}`;
    setEvents((prev) => [
      {
        id: eventId,
        title,
        eventDate: selectedDate,
        description,
        createdAt,
      },
      ...prev,
    ]);
    setEventTitle("");
    setEventDate("");
    setEventDescription("");
    trackSocialInteraction("event", eventId);
    setShowCreateEventForm(false);
  };

  const handleOrgBannerFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setBannerEditorSource(reader.result);
        setBannerEditorScale(1);
        setBannerEditorOffset({ x: 0, y: 0 });
        setShowBannerEditor(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOrgProfileLogoFile = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") return;
      const img = new Image();
      img.onload = () => {
        const max = 512;
        let w = img.width;
        let h = img.height;
        const scale = Math.min(1, max / Math.max(w, h));
        w = Math.round(w * scale);
        h = Math.round(h * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        setOrgHomeProfileLogoUrl(canvas.toDataURL("image/jpeg", 0.92));
        setProfileLogoCueOpen(false);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const saveBannerFromEditor = async () => {
    if (!bannerEditorSource) return;
    const img = new Image();
    img.src = bannerEditorSource;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("failed to load image"));
    });

    const width = 1600;
    const height = 450;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const baseScale = Math.max(width / img.width, height / img.height);
    const finalScale = baseScale * bannerEditorScale;
    const drawW = img.width * finalScale;
    const drawH = img.height * finalScale;
    const centerX = width / 2 + bannerEditorOffset.x;
    const centerY = height / 2 + bannerEditorOffset.y;
    const drawX = centerX - drawW / 2;
    const drawY = centerY - drawH / 2;

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    setOrgHomeBannerUrl(canvas.toDataURL("image/jpeg", 0.92));
    setShowBannerEditor(false);
  };

  const handleCodeOfConductDocUpload = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCodeOfConductDraftDocName(file.name);
        setCodeOfConductDraftDocDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const openCodeOfConductModal = () => {
    setCodeOfConductDraftText(codeOfConductText);
    setCodeOfConductDraftDocName(codeOfConductDocName);
    setCodeOfConductDraftDocDataUrl(codeOfConductDocDataUrl);
    const hasSaved = Boolean(codeOfConductText.trim() || codeOfConductDocDataUrl);
    setCodeOfConductAdminEditing(!hasSaved);
    setShowCodeOfConductModal(true);
  };

  const codeOfConductDraftDocMime =
    codeOfConductDraftDocDataUrl.match(/^data:([^;]+);/)?.[1]?.toLowerCase() ?? "";
  const codeOfConductSavedDocMime =
    codeOfConductDocDataUrl.match(/^data:([^;]+);/)?.[1]?.toLowerCase() ?? "";
  const isPreviewableTextMime = (mime: string) =>
    mime.startsWith("text/") ||
    mime.includes("json") ||
    mime.includes("xml") ||
    mime.includes("csv");
  const decodeDataUrlText = (dataUrl: string): string => {
    const parts = dataUrl.split(",", 2);
    if (parts.length < 2) return "";
    try {
      return decodeURIComponent(escape(atob(parts[1])));
    } catch {
      return "";
    }
  };
  const handleCreatePoll = async () => {
    if (!orgKey) return;
    const cleanedOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!pollTitle.trim() || cleanedOptions.length < 2) {
      setPollStatus("Poll title and at least two options are required.");
      return;
    }
    if (pollDeadlineChoice === "unset") {
      setPollStatus("Select whether the poll has a deadline.");
      return;
    }
    let startMs: number;
    let endMs: number;
    if (pollDeadlineChoice === "no") {
      startMs = Date.now();
      endMs = startMs + MS_OPEN_ENDED;
    } else {
      if (!pollStart.trim() || !pollEnd.trim()) {
        setPollStatus("Start and end are required when the poll has a deadline.");
        return;
      }
      startMs = new Date(pollStart).getTime();
      endMs = new Date(pollEnd).getTime();
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
        setPollStatus("Invalid start or end time.");
        return;
      }
    }

    if (!userId) {
      setPollStatus("Sign in to create a poll.");
      return;
    }
    const createBody = {
      orgId: orgKey,
      title: pollTitle.trim(),
      description: pollDescription.trim(),
      options: cleanedOptions,
      type: pollType,
      startTime: startMs,
      endTime: endMs,
    };
    const res = await fetch("/api/polls/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(createBody),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPollStatus(data?.error || "Failed to create poll.");
      return;
    }
    setPolls((prev) => [
      {
        ...data.poll,
        tally: new Array(data.poll.options.length).fill(0),
        totalVotes: 0,
        currentUserChoices: null,
      },
      ...prev,
    ]);
    setPollTitle("");
    setPollDescription("");
    setPollType("single");
    setPollOptions(["", ""]);
    setPollStart("");
    setPollEnd("");
    setPollDeadlineChoice("unset");
    setPollStatus("Poll created.");
    setShowCreatePollForm(false);
  };

  const handleJoinCommunityOrg = async () => {
    if (!userId || !orgId) return;
    try {
      const res = await fetch(`/api/community-orgs/${encodeURIComponent(orgId)}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setVoteStatus(typeof data.error === "string" ? data.error : "Could not join.");
        return;
      }
      if (Array.isArray(data.members)) setMembers(data.members);
    } catch {
      setVoteStatus("Could not join. Check your connection and try again.");
    }
  };

  const handleClearMute = async (member: string) => {
    if (!userId || !orgKey) return;
    setMuteSaving(true);
    try {
      const res = await fetch("/api/messageboard-mutes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orgKey, targetUser: member }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(typeof data.error === "string" ? data.error : "Could not unmute");
        return;
      }
      await loadMessageboardMuteState();
    } catch {
      alert("Could not unmute. Check your connection and try again.");
    } finally {
      setMuteSaving(false);
    }
  };

  const handleApplicationDecision = async (app: PendingApplicationRow, decision: "approve" | "reject") => {
    if (!userId) return;
    setApplicationError("");
    try {
      const res = await fetch(`/api/community-applications/${encodeURIComponent(app.id)}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ decision }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setApplicationError(typeof data.error === "string" ? data.error : `Could not ${decision}.`);
        return;
      }
      setApplications((prev) => prev.filter((a) => a.id !== app.id));
      if (decision === "approve") {
        setMembers((prev) => (prev.some((m) => m.toLowerCase() === app.user.toLowerCase()) ? prev : [...prev, app.user]));
      }
    } catch {
      setApplicationError(`Could not ${decision}. Check your connection and try again.`);
    }
  };

  const handleSendInvite = async () => {
    if (!userId || !invitee || !orgId) return;
    setInviteSending(true);
    setInviteError("");
    try {
      const res = await fetch("/api/member-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orgSlug: orgId, invitee }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setInviteError(typeof data.error === "string" ? data.error : "Could not send invite.");
        return;
      }
      setShowInviteModal(false);
      setInvitee(null);
      setVoteStatus(null);
      setMembersNotice("Invitation sent. They can open it from the bell icon.");
    } catch {
      setInviteError("Could not send invite. Check your connection and try again.");
    } finally {
      setInviteSending(false);
    }
  };

  const handleSetAuditor = async () => {
    if (!userId || !orgId || !auditorInput) return;
    setAuditorBusy(true);
    setAuditorError("");
    try {
      const res = await fetch(`/api/community-orgs/${encodeURIComponent(orgId)}/auditor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ auditorId: auditorInput }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAuditorError(typeof data.error === "string" ? data.error : "Could not appoint counter.");
        return;
      }
      if (data.org) setOrgRecord(data.org as CommunityOrg);
      setAuditorInput(null);
      setVoteStatus("Counter appointed.");
    } catch {
      setAuditorError("Could not appoint counter. Check your connection and try again.");
    } finally {
      setAuditorBusy(false);
    }
  };

  const handleVerificationWindow = async (voteId: string, action: "open" | "close") => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/votes/${encodeURIComponent(voteId)}/verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setVoteStatus(typeof data.error === "string" ? data.error : "Could not update verification.");
        return;
      }
      if (data.vote) {
        setCommunityVotes((prev) =>
          prev.map((v) => (v.id === voteId ? { ...v, status: data.vote.status } : v))
        );
      }
      setVoteStatus(action === "open" ? "Verification window open." : "Verification window closed.");
    } catch {
      setVoteStatus("Could not update verification. Check your connection and try again.");
    }
  };

  const handleAuditorReveal = async (vote: {
    id: string;
    title: string;
    options: string[];
  }) => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/votes/${encodeURIComponent(vote.id)}/ballots`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setVoteStatus(typeof data.error === "string" ? data.error : "Review denied.");
        return;
      }
      setAuditorReveal({
        voteId: vote.id,
        title: vote.title,
        options: vote.options,
        ballots: Array.isArray(data.ballots) ? data.ballots : [],
      });
    } catch {
      setVoteStatus("Could not load ballots. Check your connection and try again.");
    }
  };

  const handleVotePoll = async (pollId: string) => {
    if (!userId) {
      setPollStatus("Sign in to vote.");
      return;
    }
    const pollMeta = polls.find((p) => p.id === pollId);
    const choices =
      pollVotes[pollId] ??
      (pollMeta?.currentUserChoices && pollMeta.currentUserChoices.length > 0
        ? pollMeta.currentUserChoices
        : []);
    if (!choices.length) {
      setPollStatus("Pick at least one option.");
      return;
    }
    const res = await fetch("/api/polls/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ pollId, choices }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPollStatus(data?.error || "Answer not submitted. Please try again.");
      return;
    }
    setPollVotes((prev) => {
      const next = { ...prev };
      delete next[pollId];
      return next;
    });
    await reloadPolls();
    trackSocialInteraction("poll", pollId);
    setPollStatus("Vote accepted and counted.");
  };

  const handleCreateCommunityVote = async () => {
    if (!orgKey) return;
    const options = voteOptions.map((o) => o.trim()).filter(Boolean);
    if (!voteTitle.trim() || options.length < 2) {
      setVoteStatus("Vote title and at least two options are required.");
      return;
    }
    if (!voteStart.trim() || !voteEnd.trim()) {
      setVoteStatus("Start and end are required.");
      return;
    }
    const startMs = new Date(voteStart).getTime();
    const endMs = new Date(voteEnd).getTime();
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      setVoteStatus("Invalid start or end time.");
      return;
    }
    if (!userId) {
      setVoteStatus("Sign in to create a vote.");
      return;
    }
    const createBody = {
      orgId: orgKey,
      title: voteTitle.trim(),
      description: voteDescription.trim(),
      options,
      startTime: startMs,
      endTime: endMs,
      allowVoteChange,
    };
    const res = await fetch("/api/votes/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(createBody),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setVoteStatus(data?.error || "Failed to create vote.");
      return;
    }
    setCommunityVotes((prev) => [
      { ...data.vote, tally: null, totalBallots: null },
      ...prev,
    ]);
    void reloadCommunityVotes();
    setVoteTitle("");
    setVoteDescription("");
    setVoteOptions(["", ""]);
    setVoteStart("");
    setVoteEnd("");
    setAllowVoteChange(false);
    setVoteStatus("Vote created.");
    setShowCreateVoteForm(false);
  };

  const handleCastCommunityVote = async (voteId: string) => {
    if (!userId) {
      setVoteStatus("Sign in to vote.");
      return;
    }
    const educationRequired = isGovernance || orgSettings?.educationBeforeVote !== false;
    const acked = Boolean(communityEduAck[voteId]);
    if (educationRequired && !acked) {
      setPerspectivesVoteId(voteId);
      setVoteStatus("Open Perspectives before submitting a ballot.");
      return;
    }
    const choices = voteChoices[voteId] ?? [];
    if (!choices.length) {
      setVoteStatus("Pick at least one option.");
      return;
    }
    const res = await fetch("/api/votes/cast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ voteId, choices }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 428) setPerspectivesVoteId(voteId);
      setVoteStatus(data?.error || "Ballot not submitted. Try again.");
      return;
    }
    trackSocialInteraction("vote", voteId);
    void reloadCommunityVotes();
    setVoteStatus("Vote accepted and counted.");
  };

  useEffect(() => {
    if (!perspectivesVoteId) {
      setVoteEducation(null);
      return;
    }
    let cancelled = false;
    setVoteEducationLoading(true);
    ;(async () => {
      try {
        const res = await fetch(`/api/education/${encodeURIComponent(perspectivesVoteId)}`, {
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) {
          setVoteEducation(data.education ?? null);
          if (data.acknowledged === true) {
            setCommunityEduAck((prev) => ({ ...prev, [perspectivesVoteId]: true }));
          }
        }
      } finally {
        if (!cancelled) setVoteEducationLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [perspectivesVoteId]);

  // Education acknowledgements live on the server (enforced at cast time); reset the local mirror on account change.
  useEffect(() => {
    setCommunityEduAck({});
  }, [userId]);

  const acknowledgeCommunityEducation = async (voteId: string) => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/education/${encodeURIComponent(voteId)}/acknowledge`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setVoteStatus(typeof data.error === "string" ? data.error : "Could not record that you read the education.");
        return;
      }
    } catch {
      setVoteStatus("Could not record that you read the education. Check your connection and try again.");
      return;
    }
    setCommunityEduAck((prev) => ({ ...prev, [voteId]: true }));
    setPerspectivesVoteId(null);
    setVoteStatus(null);
  };

  const applyReaction = async (
    postId: string,
    reaction: "like" | "love" | "laugh" | "disagree"
  ) => {
    if (!userId) {
      alert("Sign in first");
      return;
    }

    try {
      if (!orgKey) {
        alert("Missing organization");
        return;
      }
      const res = await fetch("/api/messageboard-react-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ postId, reaction, org: orgKey }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(typeof data.error === "string" ? data.error : "Failed to react");
        if (typeof data.mutedUntil === "number") {
          setViewerMessageboardMutedUntil(data.mutedUntil);
        }
        return;
      }
      if (data?.status === "reacted" && data?.post) {
        setPosts((prev) => prev.map((p) => (p.id === postId ? data.post : p)));
        trackSocialInteraction("post", postId);
      } else {
        alert("Failed to react");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to react");
    }
  };

  const renderCommunityVotesMain = (
    votesToShow: typeof communityVotes,
    options?: {
      showSearch?: boolean;
      searchValue?: string;
      onSearchChange?: (value: string) => void;
    }
  ) => (
    <div>
      {options?.showSearch && (
        <div className="mb-6 flex justify-center">
          <div className="flex w-2/3 items-center gap-2 relative">
            <input
              type="text"
              placeholder="Search votes..."
              value={options.searchValue ?? ""}
              onChange={(e) => options.onSearchChange?.(e.target.value)}
              className="flex-1 p-2 border border-zinc-200 rounded bg-white text-zinc-900 placeholder:text-zinc-500"
            />
          </div>
        </div>
      )}
      {!showCreateVoteForm && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => {
              setShowCreateVoteForm(true);
              setVoteStatus(null);
            }}
            className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Create vote
          </button>
        </div>
      )}
      {showCreateVoteForm && (
        <div className="border border-zinc-200 p-6 rounded mb-4">
          <h2 className="text-xl mb-3">Create Community Vote</h2>
          <input
            type="text"
            value={voteTitle}
            onChange={(e) => setVoteTitle(e.target.value)}
            placeholder="Vote title"
            className="w-full mb-2 p-2 border border-zinc-200 rounded bg-white text-zinc-900 placeholder:text-zinc-500"
          />
          <textarea
            value={voteDescription}
            onChange={(e) => setVoteDescription(e.target.value)}
            placeholder="Vote description"
            className="w-full h-24 p-2 border border-zinc-200 rounded bg-white text-zinc-900 placeholder:text-zinc-500"
          />
          <div className="mt-3 text-sm text-zinc-800">
            <span className="text-gray-500 block mb-1">Voting window (required)</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              type="datetime-local"
              value={voteStart}
              onChange={(e) => setVoteStart(e.target.value)}
              className="p-2 border border-zinc-200 rounded bg-white text-zinc-900"
            />
            <input
              type="datetime-local"
              value={voteEnd}
              onChange={(e) => setVoteEnd(e.target.value)}
              className="p-2 border border-zinc-200 rounded bg-white text-zinc-900"
            />
          </div>
          <div className="mt-2 space-y-2">
            {voteOptions.map((opt, idx) => (
              <input
                key={`vote-opt-${idx}`}
                type="text"
                value={opt}
                onChange={(e) =>
                  setVoteOptions((prev) => prev.map((p, i) => (i === idx ? e.target.value : p)))
                }
                placeholder={`Option ${idx + 1}`}
                className="w-full p-2 border border-zinc-200 rounded bg-white text-zinc-900 placeholder:text-zinc-500"
              />
            ))}
            <button
              type="button"
              onClick={() => setVoteOptions((prev) => [...prev, ""])}
              className="px-3 py-1 bg-zinc-200 text-zinc-900 rounded hover:bg-zinc-300"
            >
              Add option
            </button>
          </div>
          <label className="mt-2 flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={allowVoteChange}
              onChange={(e) => setAllowVoteChange(e.target.checked)}
            />
            Allow voters to change their vote
          </label>
          <div className="mt-3 flex flex-wrap justify-between items-center gap-2">
            {voteStatus && <p className="text-sm text-zinc-600">{voteStatus}</p>}
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreateVoteForm(false);
                  setVoteStatus(null);
                }}
                className="px-4 py-2 bg-zinc-200 text-zinc-900 rounded hover:bg-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateCommunityVote}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create Vote
              </button>
            </div>
          </div>
        </div>
      )}

      {!showCreateVoteForm && voteStatus && (
        <p className="mb-3 text-sm text-zinc-700">{voteStatus}</p>
      )}
      <div className="space-y-3">
        {votesToShow.length === 0 && <p className="text-gray-400">No community votes yet.</p>}
        {votesToShow.map((vote) => {
          const now = Date.now();
          const votingOpen = now >= vote.startTime && now <= vote.endTime;
          const showResults = vote.tally != null && vote.totalBallots != null;
          return (
          <div key={vote.id} className="border border-zinc-200 rounded-lg bg-zinc-50 p-3">
            <div className="flex justify-between gap-2 items-start">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-400">{new Date(vote.createdAt).toLocaleString()}</p>
                <p className="mt-1 font-medium text-zinc-900">{vote.title}</p>
                <p className="text-sm text-zinc-700 whitespace-pre-wrap">{vote.description}</p>
                <p className="mt-2 text-xs text-gray-500">
                  {openEndedWindowLabel(vote.startTime, vote.endTime)}
                </p>
                {showResults && (
                  <p className="mt-1 text-xs text-gray-500">
                    {vote.totalBallots} ballot{vote.totalBallots === 1 ? "" : "s"} cast
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-start gap-1">
                <button
                  type="button"
                  onClick={() => setPerspectivesVoteId(vote.id)}
                  className="px-3 py-1.5 bg-amber-500 text-white rounded hover:bg-amber-600 text-sm"
                >
                  {communityEduAck[vote.id] ? "Perspectives" : "Read perspectives"}
                </button>
                {shareOrgSlug ? (
                <OrgItemShareButton
                  orgPathSegment={shareOrgSlug}
                  kind="vote"
                  resourceId={vote.id}
                  title={vote.title}
                  description={vote.description}
                  isAdmin={isAdmin}
                  onPinToHomepage={pinContentToOrgHome}
                  className="shrink-0"
                />
              ) : null}
              </div>
            </div>
            {showResults && (
              <div className="mt-3 space-y-1">
                {vote.options.map((opt, idx) => {
                  const count = vote.tally![idx] ?? 0;
                  const pct =
                    vote.totalBallots! > 0
                      ? Math.round((count / vote.totalBallots!) * 100)
                      : 0;
                  return (
                    <div key={`${vote.id}-result-${idx}`} className="text-sm text-zinc-800">
                      <div className="flex justify-between gap-2">
                        <span>{opt}</span>
                        <span className="text-zinc-500 shrink-0">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="mt-0.5 h-1.5 rounded bg-zinc-200 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {vote.mySubmission && (
              <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                <p className="font-medium">Your submission</p>
                {vote.mySubmission.linked && vote.mySubmission.choices ? (
                  <p className="mt-0.5">
                    {vote.mySubmission.choices.map((i) => vote.options[i] ?? `Option ${i + 1}`).join(", ")}
                    {vote.mySubmission.timestamp ? (
                      <span className="text-emerald-700"> · {new Date(vote.mySubmission.timestamp).toLocaleString()}</span>
                    ) : null}
                  </p>
                ) : (
                  <p className="mt-0.5 text-emerald-800">
                    Your ballot was recorded. This vote uses a secret count, so your choices are not stored with your name.
                  </p>
                )}
              </div>
            )}
            {votingOpen && (!vote.mySubmission || vote.allowVoteChange) && (
              <>
                <div className="mt-2 space-y-1">
                  {vote.options.map((opt, idx) => {
                    const selected = (voteChoices[vote.id] ?? []).includes(idx);
                    return (
                      <label key={`${vote.id}-choice-${idx}`} className="flex items-center gap-2 text-sm text-zinc-800">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(e) => {
                            setVoteChoices((prev) => {
                              const current = prev[vote.id] ?? [];
                              if (e.target.checked) return { ...prev, [vote.id]: [...current, idx] };
                              return { ...prev, [vote.id]: current.filter((v) => v !== idx) };
                            });
                          }}
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleCastCommunityVote(vote.id)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    {vote.mySubmission ? "Change vote" : "Vote"}
                  </button>
                </div>
              </>
            )}
            {!votingOpen && !showResults && userId && (
              <p className="mt-2 text-xs text-gray-500">Results visible to members after voting.</p>
            )}
            {!votingOpen && Date.now() > vote.endTime && (
              <div className="mt-3 flex flex-wrap gap-2">
                {isAdmin && vote.status !== "verification" && (
                  <button
                    type="button"
                    onClick={() => void handleVerificationWindow(vote.id, "open")}
                    className="rounded bg-zinc-800 px-3 py-1.5 text-sm text-white hover:bg-zinc-900"
                  >
                    Open verification
                  </button>
                )}
                {isAdmin && vote.status === "verification" && (
                  <button
                    type="button"
                    onClick={() => void handleVerificationWindow(vote.id, "close")}
                    className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50"
                  >
                    Close verification
                  </button>
                )}
                {isDesignatedAuditor && vote.status === "verification" && (
                  <button
                    type="button"
                    onClick={() =>
                      void handleAuditorReveal({
                        id: vote.id,
                        title: vote.title,
                        options: vote.options,
                      })
                    }
                    className="rounded bg-amber-600 px-3 py-1.5 text-sm text-white hover:bg-amber-700"
                  >
                    Reveal ballots
                  </button>
                )}
                {vote.status === "verification" && (
                  <span className="self-center text-xs text-amber-800">Verification open</span>
                )}
              </div>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-white text-zinc-900">
      <div className="w-48 border-r border-zinc-200 bg-white p-6 flex flex-col fixed h-screen">
        <div className="mx-auto mb-10 w-full">
          <div
            className={`group relative mx-auto size-[7.875rem] rounded-2xl border-2 border-dashed transition-colors ${
              isAdmin
                ? orgProfileLogoDragActive
                  ? "border-blue-500 bg-blue-50"
                  : "border-transparent hover:border-zinc-300"
                : "border-transparent"
            }`}
            onDragEnter={
              isAdmin
                ? (e) => {
                    e.preventDefault();
                    setOrgProfileLogoDragActive(true);
                  }
                : undefined
            }
            onDragOver={
              isAdmin
                ? (e) => {
                    e.preventDefault();
                    setOrgProfileLogoDragActive(true);
                  }
                : undefined
            }
            onDragLeave={
              isAdmin
                ? (e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setOrgProfileLogoDragActive(false);
                    }
                  }
                : undefined
            }
            onDrop={
              isAdmin
                ? (e) => {
                    e.preventDefault();
                    setOrgProfileLogoDragActive(false);
                    const f = e.dataTransfer.files?.[0];
                    handleOrgProfileLogoFile(f ?? null);
                  }
                : undefined
            }
            onClick={
              isAdmin
                ? () => {
                    if (typeof window !== "undefined" && window.matchMedia("(hover: none)").matches) {
                      setProfileLogoCueOpen((open) => {
                        if (open) {
                          window.setTimeout(() => profileLogoFileInputRef.current?.click(), 0);
                          return false;
                        }
                        return true;
                      });
                      return;
                    }
                    profileLogoFileInputRef.current?.click();
                  }
                : undefined
            }
            onKeyDown={
              isAdmin
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      profileLogoFileInputRef.current?.click();
                    }
                  }
                : undefined
            }
            role={isAdmin ? "button" : undefined}
            tabIndex={isAdmin ? 0 : undefined}
            aria-label={isAdmin ? "Organization logo — click or drop image to update" : undefined}
          >
            <img
              src={orgHomeProfileLogoUrl.trim() ? orgHomeProfileLogoUrl : "/logo.png"}
              alt=""
              className={`size-[7.875rem] rounded-2xl pointer-events-none ${
                orgHomeProfileLogoUrl.trim() ? "object-cover" : "object-contain"
              }`}
            />
            {isAdmin && (
              <>
                <input
                  ref={profileLogoFileInputRef}
                  type="file"
                  className="sr-only"
                  accept="image/*"
                  onChange={(e) => handleOrgProfileLogoFile(e.target.files?.[0] ?? null)}
                />
                <div
                  className={`pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60 px-1 text-center text-[10px] font-medium leading-tight text-white opacity-0 transition-opacity group-hover:opacity-100 ${
                    profileLogoCueOpen ? "opacity-100" : ""
                  }`}
                >
                  Click or drop image to update logo
                </div>
                <button
                  type="button"
                  className={`absolute right-0.5 top-0.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800/85 text-xs font-bold text-white shadow hover:bg-zinc-900 ${
                    orgHomeProfileLogoUrl.trim() ? "" : "hidden"
                  }`}
                  tabIndex={-1}
                  title="Remove logo"
                  aria-label="Remove organization logo"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOrgHomeProfileLogoUrl("");
                    setProfileLogoCueOpen(false);
                  }}
                >
                  ×
                </button>
              </>
            )}
          </div>
        </div>

        <div
          onClick={() => setView("home")}
          className={`flex items-center gap-3 mb-6 p-3 rounded cursor-pointer ${
            view === "home" ? "bg-zinc-200 font-medium" : "hover:bg-zinc-100"
          }`}
        >
          🏠 <span>Home</span>
        </div>

        <div
          onClick={() => setView("members")}
          className={`flex items-center gap-3 mb-6 p-3 rounded cursor-pointer ${
            view === "members" ? "bg-zinc-200 font-medium" : "hover:bg-zinc-100"
          }`}
        >
          👥 <span>Members</span>
        </div>

        <div
          onClick={() => {
            setView("socials");
            setSocialTab("all");
          }}
          className={`flex items-center gap-3 mb-6 p-3 rounded cursor-pointer ${
            view === "socials" ? "bg-zinc-200 font-medium" : "hover:bg-zinc-100"
          }`}
        >
          💬 <span>Socials</span>
        </div>

        <div
          onClick={() => setView("polls")}
          className={`flex items-center gap-3 mb-6 p-3 rounded cursor-pointer ${
            view === "polls" ? "bg-zinc-200 font-medium" : "hover:bg-zinc-100"
          }`}
        >
          📊 <span>Polls</span>
        </div>

        <div
          onClick={() => setView("votes")}
          className={`flex items-center gap-3 mb-6 p-3 rounded cursor-pointer ${
            view === "votes" ? "bg-zinc-200 font-medium" : "hover:bg-zinc-100"
          }`}
        >
          🗳️ <span>Votes</span>
        </div>
        <div
          onClick={() => setView("settings")}
          className={`mt-auto flex items-center gap-3 p-3 rounded cursor-pointer ${
            view === "settings" ? "bg-zinc-200 font-medium" : "hover:bg-zinc-100"
          }`}
        >
          ⚙️ <span>Settings</span>
        </div>
      </div>

      <div className="ml-48 flex-1 p-6">
        {!urlIsValid && (
          <p className="text-center text-red-600">Invalid organization link.</p>
        )}
        {urlIsValid && orgLoad === "loading" && (
          <p className="text-center text-gray-500">Loading organization…</p>
        )}
        {urlIsValid && orgLoad === "missing" && (
          <p className="text-center text-red-600">Organization not found.</p>
        )}

        {canShowMain && (
        <>
        {view !== "home" && (
          <>
            <h1 className="text-2xl font-bold mb-2 text-center w-full">{orgDisplayName || fallbackOrgName}</h1>

            <div className="mb-6 text-center text-sm text-gray-400">
              <p className="break-all">
                {isGovernance ? "Governance organization" : "Community organization"}
              </p>
              <p className="break-all">{mounted ? (userId ? "Signed in" : "Not signed in") : "Loading..."}</p>
            </div>
          </>
        )}

        {view === "home" && (
          <div className="space-y-6">
            <div className="border border-zinc-200 rounded-xl bg-zinc-50 overflow-hidden">
              <label
                className={`group relative block w-full h-56 bg-zinc-100 ${
                  isAdmin ? "cursor-pointer" : ""
                }`}
                onDragOver={(e) => {
                  if (!isAdmin) return;
                  e.preventDefault();
                  setOrgHomeBannerDragActive(true);
                }}
                onDragLeave={(e) => {
                  if (!isAdmin) return;
                  e.preventDefault();
                  setOrgHomeBannerDragActive(false);
                }}
                onDrop={(e) => {
                  if (!isAdmin) return;
                  e.preventDefault();
                  setOrgHomeBannerDragActive(false);
                  const file = e.dataTransfer.files?.[0] ?? null;
                  handleOrgBannerFile(file);
                }}
              >
                {orgHomeBannerUrl.trim() ? (
                  <img
                    src={orgHomeBannerUrl.trim()}
                    alt="Organization banner"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm text-zinc-500">
                    No banner image yet
                  </div>
                )}
                {isAdmin && (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleOrgBannerFile(e.target.files?.[0] ?? null)}
                    />
                    <div
                      className={`absolute inset-0 flex items-center justify-center text-sm font-medium transition ${
                        orgHomeBannerDragActive
                          ? "bg-blue-600/45 text-white"
                          : "bg-black/0 text-white opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                      }`}
                    >
                      Click or drop image to update banner
                    </div>
                  </>
                )}
              </label>
              <div className="p-5">
                <h1 className="text-3xl font-bold text-zinc-900">{orgDisplayName || fallbackOrgName}</h1>
                <p className="mt-2 text-zinc-700 whitespace-pre-wrap">{orgDescriptionText}</p>
                <p className="mt-3 text-xs text-gray-500 break-all">
                  {isGovernance ? "Governance organization" : "Community organization"}
                </p>
              </div>
            </div>

            <div className="flex">
              <button
                type="button"
                onClick={openCodeOfConductModal}
                className="px-4 py-2 bg-zinc-200 text-zinc-900 rounded hover:bg-zinc-300"
              >
                Code of Conduct
              </button>
            </div>

            <div className="border border-zinc-200 rounded-xl bg-zinc-50 p-5">
              <h2 className="text-xl font-semibold text-zinc-900 mb-3">Pinned notes</h2>
              {isAdmin && (
                <div className="mb-4">
                  <textarea
                    value={orgHomeNoteDraft}
                    onChange={(e) => setOrgHomeNoteDraft(e.target.value)}
                    placeholder="Add a pinned note for members..."
                    className="w-full h-24 p-3 border border-zinc-200 rounded bg-white text-zinc-900 placeholder:text-zinc-500"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const note = orgHomeNoteDraft.trim();
                        if (!note) return;
                        setOrgHomePinnedNotes((prev) => [note, ...prev]);
                        setOrgHomeNoteDraft("");
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Pin note
                    </button>
                  </div>
                </div>
              )}
              {orgHomePinnedNotes.length === 0 ? (
                <p className="text-sm text-zinc-500">No pinned notes yet.</p>
              ) : (
                <div className="space-y-3">
                  {orgHomePinnedNotes.map((note, idx) => {
                    const eventPin = parsePinnedEventNote(note);
                    const matchedEvent =
                      eventPin &&
                      (eventPin.shareId
                        ? events.find((e) => e.id === eventPin.shareId)
                        : events.find((e) => e.title === eventPin.title));
                    if (eventPin) {
                      const createdLabel = matchedEvent
                        ? new Date(matchedEvent.createdAt).toLocaleString()
                        : "Pinned";
                      const resourceId = matchedEvent?.id ?? eventPin.shareId ?? eventPin.title;
                      return (
                        <div
                          key={`pinned-${idx}-${resourceId.slice(0, 24)}`}
                          className="border border-zinc-200 rounded-lg bg-zinc-50 p-3"
                        >
                          <div className="flex justify-between gap-2 items-start">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-gray-400">Event • {createdLabel}</p>
                              {matchedEvent?.eventDate ? (
                                <p className="text-xs text-gray-500">
                                  Scheduled: {new Date(matchedEvent.eventDate).toLocaleString()}
                                </p>
                              ) : null}
                              <p className="mt-2 font-medium text-zinc-800">{eventPin.title}</p>
                              <p className="text-sm text-zinc-700 whitespace-pre-wrap">
                                {eventPin.description ||
                                  matchedEvent?.description ||
                                  ""}
                              </p>
                            </div>
                            {(isAdmin || shareOrgSlug) && (
                              <div className="flex shrink-0 items-start gap-2">
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOrgHomePinnedNotes((prev) => prev.filter((_, i) => i !== idx))
                                    }
                                    className="rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
                                  >
                                    Unpin
                                  </button>
                                )}
                                {shareOrgSlug ? (
                                  <OrgItemShareButton
                                    orgPathSegment={shareOrgSlug}
                                    kind="event"
                                    resourceId={resourceId}
                                    title={eventPin.title}
                                    description={eventPin.description || matchedEvent?.description || ""}
                                    isAdmin={isAdmin}
                                    onPinToHomepage={pinContentToOrgHome}
                                    className="shrink-0"
                                  />
                                ) : null}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={`pinned-${idx}-${note.slice(0, 20)}`}
                        className="border border-zinc-200 rounded bg-white p-3"
                      >
                        <p className="text-sm text-zinc-800 whitespace-pre-wrap">{note}</p>
                        {isAdmin && (
                          <div className="mt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                setOrgHomePinnedNotes((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="text-xs px-3 py-1 rounded bg-zinc-200 text-zinc-900 hover:bg-zinc-300"
                            >
                              Unpin
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {isAdmin && showBannerEditor && (
              <div
                className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
                onClick={() => setShowBannerEditor(false)}
              >
                <div
                  className="w-full max-w-4xl max-h-[90vh] overflow-auto rounded-xl border border-zinc-200 bg-white p-4 relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    aria-label="Close banner editor"
                    onClick={() => setShowBannerEditor(false)}
                    className="absolute top-3 right-3 h-8 w-8 rounded bg-zinc-200 text-zinc-900 hover:bg-zinc-300"
                  >
                    ×
                  </button>
                  <h3 className="text-lg font-semibold text-zinc-900 mb-2">Edit banner</h3>
                  <p className="text-sm text-zinc-600 mb-3">Drag image to reposition. Use zoom to scale.</p>

                  <div
                    className="relative w-full h-64 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 cursor-grab active:cursor-grabbing"
                    onMouseDown={(e) => {
                      setBannerEditorDragging(true);
                      setBannerEditorDragStart({
                        x: e.clientX - bannerEditorOffset.x,
                        y: e.clientY - bannerEditorOffset.y,
                      });
                    }}
                    onMouseMove={(e) => {
                      if (!bannerEditorDragging) return;
                      setBannerEditorOffset({
                        x: e.clientX - bannerEditorDragStart.x,
                        y: e.clientY - bannerEditorDragStart.y,
                      });
                    }}
                    onMouseUp={() => setBannerEditorDragging(false)}
                    onMouseLeave={() => setBannerEditorDragging(false)}
                  >
                    {bannerEditorSource && (
                      <img
                        src={bannerEditorSource}
                        alt="Banner editor preview"
                        draggable={false}
                        className="absolute left-1/2 top-1/2 pointer-events-none select-none max-w-none"
                        style={{
                          transform: `translate(calc(-50% + ${bannerEditorOffset.x}px), calc(-50% + ${bannerEditorOffset.y}px)) scale(${bannerEditorScale})`,
                          transformOrigin: "center center",
                        }}
                      />
                    )}
                  </div>

                  <div className="mt-3">
                    <label className="text-sm text-zinc-700 block mb-1">Zoom</label>
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.01"
                      value={bannerEditorScale}
                      onChange={(e) => setBannerEditorScale(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowBannerEditor(false)}
                      className="px-4 py-2 bg-zinc-200 text-zinc-900 rounded hover:bg-zinc-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void saveBannerFromEditor();
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showCodeOfConductModal && (
              <div
                className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
                onClick={() => {
                  setShowCodeOfConductModal(false);
                  setCodeOfConductAdminEditing(false);
                }}
              >
                <div
                  className="w-full max-w-3xl max-h-[90vh] overflow-auto rounded-xl border border-zinc-200 bg-white p-5 relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    aria-label="Close code of conduct"
                    onClick={() => {
                      setShowCodeOfConductModal(false);
                      setCodeOfConductAdminEditing(false);
                    }}
                    className="absolute top-3 right-3 h-8 w-8 rounded bg-zinc-200 text-zinc-900 hover:bg-zinc-300"
                  >
                    ×
                  </button>
                  <h3 className="text-lg font-semibold text-zinc-900 mb-2">Code of Conduct</h3>
                  {isAdmin ? (
                    codeOfConductAdminEditing ? (
                    <>
                      <p className="text-sm text-zinc-600 mb-3">
                        Add expectations for members and optionally attach a conduct document.
                      </p>
                      {codeOfConductDraftDocDataUrl && (
                        <div className="mb-3 border border-zinc-200 rounded bg-zinc-50 p-2">
                          <p className="text-xs text-zinc-500 mb-2">Document preview</p>
                          {codeOfConductDraftDocMime.startsWith("image/") ? (
                            <img
                              src={codeOfConductDraftDocDataUrl}
                              alt={codeOfConductDraftDocName || "Attached document preview"}
                              className="max-h-72 w-auto rounded border border-zinc-200 bg-white"
                            />
                          ) : isPreviewableTextMime(codeOfConductDraftDocMime) ? (
                            <pre className="max-h-72 overflow-auto rounded border border-zinc-200 bg-white p-3 text-xs text-zinc-800 whitespace-pre-wrap">
                              {decodeDataUrlText(codeOfConductDraftDocDataUrl) || "Preview unavailable for this text file."}
                            </pre>
                          ) : (
                            <div className="rounded border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
                              Inline preview is not supported for this file type in your browser/security settings.
                              The document is still attached and will be visible by name.
                            </div>
                          )}
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <p className="text-xs text-zinc-600 truncate">{codeOfConductDraftDocName || "Attached document"}</p>
                            <button
                              type="button"
                              onClick={() => {
                                setCodeOfConductDraftDocName("");
                                setCodeOfConductDraftDocDataUrl("");
                              }}
                              className="text-xs px-3 py-1 rounded bg-zinc-200 text-zinc-900 hover:bg-zinc-300"
                            >
                              Remove attached document
                            </button>
                          </div>
                        </div>
                      )}
                      <textarea
                        value={codeOfConductDraftText}
                        onChange={(e) => setCodeOfConductDraftText(e.target.value)}
                        placeholder="Type your code of conduct expectations..."
                        className={`w-full h-40 p-3 border rounded bg-white text-zinc-900 placeholder:text-zinc-500 ${
                          codeOfConductDocDragActive ? "border-blue-500 ring-2 ring-blue-200" : "border-zinc-200"
                        }`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setCodeOfConductDocDragActive(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          setCodeOfConductDocDragActive(false);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setCodeOfConductDocDragActive(false);
                          const file = e.dataTransfer.files?.[0] ?? null;
                          handleCodeOfConductDocUpload(file);
                        }}
                      />
                      <div className="mt-3">
                        <label className="text-sm text-zinc-700 block mb-1">Upload document (or drag into text box)</label>
                        <label className="inline-flex items-center px-3 py-1.5 rounded border border-blue-300 bg-blue-50 text-blue-700 text-sm font-medium cursor-pointer hover:bg-blue-100">
                          Choose File
                          <input
                            type="file"
                            onChange={(e) => handleCodeOfConductDocUpload(e.target.files?.[0] ?? null)}
                            className="hidden"
                          />
                        </label>
                        {codeOfConductDraftDocName && (
                          <p className="mt-2 text-xs text-zinc-600">Attached: {codeOfConductDraftDocName}</p>
                        )}
                      </div>
                      <div className="mt-4 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (codeOfConductHasSavedContent) {
                              setCodeOfConductDraftText(codeOfConductText);
                              setCodeOfConductDraftDocName(codeOfConductDocName);
                              setCodeOfConductDraftDocDataUrl(codeOfConductDocDataUrl);
                              setCodeOfConductAdminEditing(false);
                            } else {
                              setShowCodeOfConductModal(false);
                              setCodeOfConductAdminEditing(false);
                            }
                          }}
                          className="px-4 py-2 bg-zinc-200 text-zinc-900 rounded hover:bg-zinc-300"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCodeOfConductText(codeOfConductDraftText.trim());
                            setCodeOfConductDocName(codeOfConductDraftDocName);
                            setCodeOfConductDocDataUrl(codeOfConductDraftDocDataUrl);
                            setShowCodeOfConductModal(false);
                            setCodeOfConductAdminEditing(false);
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Save
                        </button>
                      </div>
                    </>
                    ) : (
                    <>
                      <p className="text-sm text-zinc-800 whitespace-pre-wrap">
                        {codeOfConductText || "No code of conduct has been published yet."}
                      </p>
                      {codeOfConductDocDataUrl && codeOfConductDocName && (
                        <div className="mt-3 border border-zinc-200 rounded bg-zinc-50 p-2">
                          <p className="text-xs text-zinc-500 mb-2">{codeOfConductDocName}</p>
                          {codeOfConductSavedDocMime.startsWith("image/") ? (
                            <img
                              src={codeOfConductDocDataUrl}
                              alt={codeOfConductDocName}
                              className="max-h-72 w-auto rounded border border-zinc-200 bg-white"
                            />
                          ) : isPreviewableTextMime(codeOfConductSavedDocMime) ? (
                            <pre className="max-h-72 overflow-auto rounded border border-zinc-200 bg-white p-3 text-xs text-zinc-800 whitespace-pre-wrap">
                              {decodeDataUrlText(codeOfConductDocDataUrl) || "Preview unavailable for this text file."}
                            </pre>
                          ) : (
                            <div className="rounded border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
                              Inline preview is not supported for this file type in your browser/security settings.
                            </div>
                          )}
                        </div>
                      )}
                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setCodeOfConductAdminEditing(true)}
                          className="px-4 py-2 bg-zinc-200 text-zinc-900 rounded hover:bg-zinc-300"
                        >
                          Change
                        </button>
                      </div>
                    </>
                    )
                  ) : (
                    <>
                      <p className="text-sm text-zinc-800 whitespace-pre-wrap">
                        {codeOfConductText || "No code of conduct has been published yet."}
                      </p>
                      {codeOfConductDocDataUrl && codeOfConductDocName && (
                        <div className="mt-3 border border-zinc-200 rounded bg-zinc-50 p-2">
                          <p className="text-xs text-zinc-500 mb-2">{codeOfConductDocName}</p>
                          {codeOfConductSavedDocMime.startsWith("image/") ? (
                            <img
                              src={codeOfConductDocDataUrl}
                              alt={codeOfConductDocName}
                              className="max-h-72 w-auto rounded border border-zinc-200 bg-white"
                            />
                          ) : isPreviewableTextMime(codeOfConductSavedDocMime) ? (
                            <pre className="max-h-72 overflow-auto rounded border border-zinc-200 bg-white p-3 text-xs text-zinc-800 whitespace-pre-wrap">
                              {decodeDataUrlText(codeOfConductDocDataUrl) || "Preview unavailable for this text file."}
                            </pre>
                          ) : (
                            <div className="rounded border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
                              Inline preview is not supported for this file type in your browser/security settings.
                            </div>
                          )}
                        </div>
                      )}
                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setShowCodeOfConductModal(false)}
                          className="px-4 py-2 bg-zinc-200 text-zinc-900 rounded hover:bg-zinc-300"
                        >
                          Close
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {view === "members" && (
          <>
            <div className="mb-6 flex justify-center">
              <div className="flex w-2/3 items-center gap-2 relative">
                <input
                  type="text"
                  placeholder="Search members..."
                  value={membersSearch}
                  onChange={(e) => setMembersSearch(e.target.value)}
                  className="flex-1 p-2 border border-zinc-200 rounded bg-white text-zinc-900 placeholder:text-zinc-500"
                />
              </div>
            </div>

            {isAdmin && (
              <div className="mb-6 flex gap-4 justify-center">
                <button
                  onClick={() => setMembersTab("all")}
                  className={`px-4 py-2 ${
                    membersTab === "all" ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-zinc-200 text-zinc-900 hover:bg-zinc-300"
                  } rounded`}
                >
                  All
                </button>
                <button
                  onClick={() => setMembersTab("pending")}
                  className={`px-4 py-2 ${
                    membersTab === "pending" ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-zinc-200 text-zinc-900 hover:bg-zinc-300"
                  } rounded`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setMembersTab("manage")}
                  className={`px-4 py-2 ${
                    membersTab === "manage" ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-zinc-200 text-zinc-900 hover:bg-zinc-300"
                  } rounded`}
                >
                  Manage
                </button>
                {canInviteMembers && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowInviteModal(true);
                      setInvitee(null);
                      setInviteError("");
                    }}
                    className="px-4 py-2 bg-zinc-200 text-zinc-900 rounded hover:bg-zinc-300"
                  >
                    Invite
                  </button>
                )}
              </div>
            )}

            {membersNotice && (
              <p className="mb-4 text-center text-sm text-zinc-700">{membersNotice}</p>
            )}

            {(!isAdmin || membersTab === "all") && (
              <div className="mb-6 p-4 border border-zinc-200 rounded bg-zinc-50 text-zinc-900">
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <h2 className="text-xl">All Members</h2>
                  {orgRecord &&
                    orgRecord.membershipMode !== "Manual" &&
                    userId &&
                    !isViewerMember && (
                      <button
                        type="button"
                        onClick={() => void handleJoinCommunityOrg()}
                        className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
                      >
                        Join
                      </button>
                    )}
                </div>
                {!orgRecord ? (
                  <p className="text-gray-400 text-sm">Loading…</p>
                ) : !isViewerMember ? (
                  <p className="text-gray-400 text-sm">
                    {orgRecord.memberCount ?? members.length} member{(orgRecord.memberCount ?? members.length) === 1 ? "" : "s"}.
                    Join to see who is in this organization.
                  </p>
                ) : filteredMembers.length === 0 ? (
                  <p className="text-gray-400 text-sm">
                    {membersSearch.trim() ? "No members found for this search." : "No members yet."}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {filteredMembers.map((member) => {
                      const mu = muteByMemberLower.get(member.toLowerCase()) ?? null;
                      const mutedActive = mu !== null && mu > Date.now();
                      return (
                        <div
                          key={member}
                          className="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-100 pb-2 last:border-0"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-700">
                              {nameOf(member)}
                              {userId && member.toLowerCase() === userId.toLowerCase() && (
                                <span className="ml-1 text-xs text-zinc-400">(you)</span>
                              )}
                            </p>
                            {mutedActive && (
                              <p className="mt-0.5 text-xs text-amber-700">
                                Messageboard muted until {new Date(mu).toLocaleString()}
                              </p>
                            )}
                          </div>
                          {isAdmin &&
                            userId?.toLowerCase() !== member.toLowerCase() && (
                              <div className="flex shrink-0 gap-1">
                                {mutedActive ? (
                                  <button
                                    type="button"
                                    disabled={muteSaving}
                                    onClick={() => void handleClearMute(member)}
                                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
                                  >
                                    Unmute
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMuteMemberModal(member);
                                      setMutePreset("24h");
                                      setMuteCustomHours("24");
                                    }}
                                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 hover:bg-zinc-50"
                                  >
                                    Mute
                                  </button>
                                )}
                              </div>
                            )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {isAdmin && membersTab === "manage" && (
              <div className="mb-6 p-4 border border-zinc-200 rounded bg-zinc-50 text-zinc-900">
                <h2 className="text-xl mb-3">Manage Members</h2>
                <div className="mb-4 rounded border border-zinc-200 bg-white p-3">
                  <p className="text-sm font-medium text-zinc-900">Counter</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Appoint someone else to count. They can see who voted how only while verification is open.
                    They cannot be the person who runs this organization.
                  </p>
                  {orgRecord?.auditorId ? (
                    <p className="mt-2 text-sm text-zinc-700">{nameOf(orgRecord.auditorId)}</p>
                  ) : (
                    <p className="mt-2 text-sm text-zinc-500">None appointed</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-start gap-2">
                    <div className="min-w-[14rem] flex-1">
                      <PersonPicker
                        value={auditorInput}
                        onChange={(id) => {
                          setAuditorInput(id);
                          setAuditorError("");
                        }}
                        placeholder="Search by name or email"
                        exclude={userId ? [userId] : []}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={auditorBusy || !auditorInput}
                      onClick={() => void handleSetAuditor()}
                      className="rounded bg-zinc-800 px-3 py-2 text-sm text-white hover:bg-zinc-900 disabled:opacity-50"
                    >
                      {auditorBusy ? "Saving…" : "Appoint"}
                    </button>
                  </div>
                  {auditorError && <p className="mt-2 text-sm text-red-600">{auditorError}</p>}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manageSearch}
                    onChange={(e) => setManageSearch(e.target.value)}
                    placeholder="Search by name"
                    className="flex-1 p-2 border border-zinc-200 rounded bg-white text-zinc-900 placeholder:text-zinc-500"
                  />
                  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Add</button>
                </div>
                <p className="mt-3 text-sm text-gray-400">
                  Adding and removing members from this search is not available yet.
                </p>
              </div>
            )}

            {isAdmin && membersTab === "pending" && orgRecord?.membershipMode === "Manual" && (
              <div className="mt-8 border border-zinc-200 p-4 rounded">
                <h2 className="text-xl mb-4">Pending Requests</h2>

                {applications.length === 0 && (
                  <p className="text-gray-400">No pending requests</p>
                )}

                {applications.map((app) => (
                  <div key={app.id} className="mb-4 border-b border-zinc-200 pb-2">
                    <p className="text-sm">{nameOf(app.user)}</p>
                    <p className="text-gray-400 mb-2">{app.message || "No message"}</p>
                    {app.answers && app.answers.length > 0 && (
                      <div className="mb-3 space-y-2 text-sm text-zinc-800">
                        {app.answers.map((ans) => (
                          <div key={ans.fieldId}>
                            <span className="font-medium">{ans.label}: </span>
                            {ans.type === "file" && ans.value ? (
                              <a
                                href={`/api/join-files/${encodeURIComponent(ans.value)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-700 hover:underline"
                              >
                                View upload
                              </a>
                            ) : (
                              <span>{ans.value || "—"}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleApplicationDecision(app, "approve")}
                      className="px-4 py-1 rounded mr-2 bg-green-600 text-white hover:bg-green-500"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleApplicationDecision(app, "reject")}
                      className="px-4 py-1 bg-red-600 text-white rounded hover:bg-red-500"
                    >
                      Reject
                    </button>
                  </div>
                ))}
                {applicationError && <p className="mt-2 text-sm text-red-600">{applicationError}</p>}
              </div>
            )}
          </>
        )}

        {view === "socials" && (
          <>
            <div className="mb-6 flex justify-center">
              <div className="flex w-2/3 items-center gap-2 relative">
                <input
                  type="text"
                  placeholder={
                    socialTab === "events"
                      ? "Search community events..."
                      : socialTab === "votes"
                        ? "Search community votes..."
                        : socialTab === "all"
                          ? "Search events, posts, polls, and votes..."
                          : "Search posts..."
                  }
                  value={socialSearch}
                  onChange={(e) => setSocialSearch(e.target.value)}
                  className="flex-1 p-2 border border-zinc-200 rounded bg-white text-zinc-900 placeholder:text-zinc-500"
                />
                <div className="relative">
                  <button
                    onClick={() => setShowSocialSort(!showSocialSort)}
                    className="px-3 py-2 bg-zinc-200 text-zinc-900 rounded hover:bg-zinc-300"
                  >
                    Sort
                  </button>
                  {showSocialSort && (
                    <div className="absolute right-0 mt-2 bg-white border border-zinc-200 rounded shadow-lg z-10 min-w-36">
                      <button
                        onClick={() => {
                          setSocialSortOrder("recent");
                          setShowSocialSort(false);
                        }}
                        className="block w-full text-left px-4 py-2 hover:bg-zinc-100 text-zinc-900"
                      >
                        Recent
                      </button>
                      <button
                        onClick={() => {
                          setSocialSortOrder("popular");
                          setShowSocialSort(false);
                        }}
                        className="block w-full text-left px-4 py-2 hover:bg-zinc-100 text-zinc-900"
                      >
                        Popular
                      </button>
                      <button
                        onClick={() => {
                          setSocialSortOrder("newest");
                          setShowSocialSort(false);
                        }}
                        className="block w-full text-left px-4 py-2 hover:bg-zinc-100 text-zinc-900"
                      >
                        Newest
                      </button>
                      <button
                        onClick={() => {
                          setSocialSortOrder("oldest");
                          setShowSocialSort(false);
                        }}
                        className="block w-full text-left px-4 py-2 hover:bg-zinc-100 text-zinc-900"
                      >
                        Oldest
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-6 flex gap-4 justify-center">
              <button
                onClick={() => setSocialTab("all")}
                className={`px-4 py-2 ${
                  socialTab === "all" ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-zinc-200 text-zinc-900 hover:bg-zinc-300"
                } rounded`}
              >
                All
              </button>
              <button
                onClick={() => setSocialTab("events")}
                className={`px-4 py-2 ${
                  socialTab === "events" ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-zinc-200 text-zinc-900 hover:bg-zinc-300"
                } rounded`}
              >
                Events
              </button>
              <button
                onClick={() => setSocialTab("messageboard")}
                className={`px-4 py-2 ${
                  socialTab === "messageboard" ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-zinc-200 text-zinc-900 hover:bg-zinc-300"
                } rounded`}
              >
                Messageboard
              </button>
            </div>

            {socialTab === "all" && (
              <div className="space-y-3">
                {sortedSocialAllFeed.length === 0 && (
                  <p className="text-gray-400">No events, posts, polls, or votes yet.</p>
                )}
                {sortedSocialAllFeed.map((entry) => {
                  if (entry.kind === "event") {
                    return (
                      <div key={`event-${entry.item.id}`} className="border border-zinc-200 rounded-lg bg-zinc-50 p-3">
                        <div className="flex justify-between gap-2 items-start">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-gray-400">Event • {new Date(entry.item.createdAt).toLocaleString()}</p>
                            {entry.item.eventDate && (
                              <p className="text-xs text-gray-500">Scheduled: {new Date(entry.item.eventDate).toLocaleString()}</p>
                            )}
                            <p className="mt-2 font-medium text-zinc-800">{entry.item.title}</p>
                            <p className="text-sm text-zinc-700 whitespace-pre-wrap">{entry.item.description}</p>
                          </div>
                          {shareOrgSlug ? (
                            <OrgItemShareButton
                              orgPathSegment={shareOrgSlug}
                              kind="event"
                              resourceId={entry.item.id}
                              title={entry.item.title}
                              description={entry.item.description}
                              isAdmin={isAdmin}
                              onPinToHomepage={pinContentToOrgHome}
                              className="shrink-0"
                            />
                          ) : null}
                        </div>
                      </div>
                    );
                  }
                  if (entry.kind === "poll") {
                    return (
                      <div key={`poll-${entry.item.id}`} className="border border-zinc-200 rounded-lg bg-zinc-50 p-3">
                        <div className="flex justify-between gap-2 items-start">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-gray-400">Poll • {new Date(entry.item.createdAt).toLocaleString()}</p>
                            <p className="mt-2 font-medium text-zinc-800">{entry.item.title}</p>
                            <p className="text-sm text-zinc-700 whitespace-pre-wrap">{entry.item.description}</p>
                          </div>
                          {shareOrgSlug ? (
                            <OrgItemShareButton
                              orgPathSegment={shareOrgSlug}
                              kind="poll"
                              resourceId={entry.item.id}
                              title={entry.item.title}
                              description={entry.item.description}
                              isAdmin={isAdmin}
                              onPinToHomepage={pinContentToOrgHome}
                              className="shrink-0"
                            />
                          ) : null}
                        </div>
                      </div>
                    );
                  }
                  if (entry.kind === "vote") {
                    return (
                      <div key={`vote-${entry.item.id}`} className="border border-zinc-200 rounded-lg bg-zinc-50 p-3">
                        <div className="flex justify-between gap-2 items-start">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-gray-400">Vote • {new Date(entry.item.createdAt).toLocaleString()}</p>
                            <p className="mt-2 font-medium text-zinc-800">{entry.item.title}</p>
                            <p className="text-sm text-zinc-700 whitespace-pre-wrap">{entry.item.description}</p>
                            <p className="mt-2 text-xs text-gray-500">
                              {openEndedWindowLabel(entry.item.startTime, entry.item.endTime)}
                            </p>
                          </div>
                          {shareOrgSlug ? (
                            <OrgItemShareButton
                              orgPathSegment={shareOrgSlug}
                              kind="vote"
                              resourceId={entry.item.id}
                              title={entry.item.title}
                              description={entry.item.description}
                              isAdmin={isAdmin}
                              onPinToHomepage={pinContentToOrgHome}
                              className="shrink-0"
                            />
                          ) : null}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={`post-${entry.item.id}`} className="border border-zinc-200 rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs text-gray-400 break-all">
                        Messageboard • {nameOf(entry.item.user)} • {new Date(entry.item.timestamp).toLocaleString()}
                      </p>
                      <p className="mt-2 text-sm text-zinc-800 whitespace-pre-wrap">{entry.item.text}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {socialTab === "events" && (
              <div>
                {events.length > 0 && !showCreateEventForm && (
                  <div className="mb-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateEventForm(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Plan a Community Event
                    </button>
                  </div>
                )}
                {(events.length === 0 || showCreateEventForm) && (
                  <div className="border border-zinc-200 p-6 rounded mb-4">
                    <h2 className="text-xl mb-3">Plan a Community Event</h2>
                    <input
                      type="text"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      placeholder="Event title"
                      className="w-full mb-2 p-2 border border-zinc-200 rounded bg-white text-zinc-900 placeholder:text-zinc-500"
                    />
                    <textarea
                      value={eventDescription}
                      onChange={(e) => setEventDescription(e.target.value)}
                      placeholder="Event description"
                      className="w-full h-24 p-2 border border-zinc-200 rounded bg-white text-zinc-900 placeholder:text-zinc-500"
                    />
                    <input
                      type="datetime-local"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full mt-2 p-2 border border-zinc-200 rounded bg-white text-zinc-900"
                    />
                    <div className="mt-3 flex justify-end gap-2">
                      {events.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowCreateEventForm(false)}
                          className="px-4 py-2 bg-zinc-200 text-zinc-900 rounded hover:bg-zinc-300"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleCreateEvent}
                        disabled={!eventTitle.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        Create Event
                      </button>
                    </div>
                  </div>
                )}
                <div className="space-y-3">
                  {sortedFilteredEvents.length === 0 && <p className="text-gray-400">No events yet.</p>}
                  {sortedFilteredEvents.map((event) => (
                    <div key={event.id} className="border border-zinc-200 rounded-lg bg-zinc-50 p-3">
                      <div className="flex justify-between gap-2 items-start">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-400">{new Date(event.createdAt).toLocaleString()}</p>
                          {event.eventDate && (
                            <p className="text-xs text-gray-500 mt-1">
                              Event date: {new Date(event.eventDate).toLocaleString()}
                            </p>
                          )}
                          <p className="mt-2 font-medium text-zinc-800">{event.title}</p>
                          <p className="text-sm text-zinc-700 whitespace-pre-wrap">{event.description}</p>
                        </div>
                        {shareOrgSlug ? (
                          <OrgItemShareButton
                            orgPathSegment={shareOrgSlug}
                            kind="event"
                            resourceId={event.id}
                            title={event.title}
                            description={event.description}
                            isAdmin={isAdmin}
                            onPinToHomepage={pinContentToOrgHome}
                            className="shrink-0"
                          />
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {socialTab === "messageboard" && (
              <div>
                {isViewerMessageboardMuted && viewerMessageboardMutedUntil && (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    You cannot post or react on the messageboard until{" "}
                    {new Date(viewerMessageboardMutedUntil).toLocaleString()}. You can still vote, join events, and use
                    the rest of the organization.
                  </div>
                )}
                <div className="mb-4">
                  <textarea
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                    placeholder="Post a note for the community..."
                    disabled={isViewerMessageboardMuted}
                    className="w-full h-28 p-3 border border-zinc-200 rounded bg-white text-zinc-900 placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={async () => {
                        const text = postText.trim();
                        if (!text) return;
                        if (!userId || !orgKey) {
                          alert("Sign in first");
                          return;
                        }

                        try {
                          const res = await fetch("/api/messageboard-proxy", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ org: orgKey, text }),
                          });
                          const data = await res.json();

                          if (!res.ok) {
                            alert(typeof data.error === "string" ? data.error : "Failed to post");
                            if (typeof data.mutedUntil === "number") {
                              setViewerMessageboardMutedUntil(data.mutedUntil);
                            }
                            return;
                          }

                          if (data?.status === "posted" && data?.post) {
                            setPosts((prev) => [data.post, ...prev]);
                            setPostText("");
                          } else {
                            alert("Failed to post");
                          }
                        } catch (err) {
                          console.error(err);
                          alert("Failed to post");
                        }
                      }}
                      disabled={!postText.trim() || isViewerMessageboardMuted}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      Post
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {sortedFilteredPosts.length === 0 && (
                    <p className="text-gray-400">No posts found.</p>
                  )}

                  {sortedFilteredPosts.map((post) => (
                    <div key={post.id} className="border border-zinc-200 rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs text-gray-400">
                        {nameOf(post.user)} • {new Date(post.timestamp).toLocaleString()}
                      </p>
                      <p className="mt-2 text-sm text-zinc-800 whitespace-pre-wrap">{post.text}</p>
                      <div className="mt-3 flex gap-2">
                        <div
                          className="relative"
                          onMouseEnter={() => setHoveredLikePostId(post.id)}
                          onMouseLeave={() =>
                            setHoveredLikePostId((current) => (current === post.id ? null : current))
                          }
                        >
                          <button
                            type="button"
                            disabled={isViewerMessageboardMuted}
                            onClick={() => applyReaction(post.id, "like")}
                            className="px-3 py-1 text-sm bg-zinc-200 text-zinc-900 rounded hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Like
                          </button>
                          {hoveredLikePostId === post.id && (
                            <div className="absolute left-0 top-full z-10 flex gap-2 rounded border border-zinc-200 bg-white p-2 shadow-lg">
                              <button
                                type="button"
                                disabled={isViewerMessageboardMuted}
                                className="text-sm px-2 py-1 rounded hover:bg-zinc-100 text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Love"
                                onClick={() => applyReaction(post.id, "love")}
                              >
                                ❤️
                              </button>
                              <button
                                type="button"
                                disabled={isViewerMessageboardMuted}
                                className="text-sm px-2 py-1 rounded hover:bg-zinc-100 text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Laugh"
                                onClick={() => applyReaction(post.id, "laugh")}
                              >
                                😂
                              </button>
                              <button
                                type="button"
                                disabled={isViewerMessageboardMuted}
                                className="text-sm px-2 py-1 rounded hover:bg-zinc-100 text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Disagree"
                                onClick={() => applyReaction(post.id, "disagree")}
                              >
                                👎
                              </button>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={isViewerMessageboardMuted}
                          className="px-3 py-1 text-sm bg-zinc-200 text-zinc-900 rounded hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Comment
                        </button>
                      </div>
                      <div className="mt-2 text-xs text-gray-400 flex gap-4">
                        <span>👍 {post.reactions?.like?.length ?? 0}</span>
                        <span>❤️ {post.reactions?.love?.length ?? 0}</span>
                        <span>😂 {post.reactions?.laugh?.length ?? 0}</span>
                        <span>👎 {post.reactions?.disagree?.length ?? 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {socialTab === "votes" && renderCommunityVotesMain(sortedFilteredVotes)}
          </>
        )}

        {view === "polls" && (
          <>
            <div className="mb-6 flex justify-center">
              <div className="flex w-2/3 items-center gap-2 relative">
                <input
                  type="text"
                  placeholder="Search polls..."
                  value={socialSearch}
                  onChange={(e) => setSocialSearch(e.target.value)}
                  className="flex-1 p-2 border border-zinc-200 rounded bg-white text-zinc-900 placeholder:text-zinc-500"
                />
              </div>
            </div>
              <div>
                {!showCreatePollForm && (
                  <div className="mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreatePollForm(true);
                        setPollStatus(null);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Create Poll
                    </button>
                  </div>
                )}
                {showCreatePollForm && (
                <div className="border border-zinc-200 p-6 rounded mb-4">
                  <h2 className="text-xl mb-3">Create Poll</h2>
                  <input
                    type="text"
                    value={pollTitle}
                    onChange={(e) => setPollTitle(e.target.value)}
                    placeholder="Poll title"
                    className="w-full mb-2 p-2 border border-zinc-200 rounded bg-white text-zinc-900 placeholder:text-zinc-500"
                  />
                  <textarea
                    value={pollDescription}
                    onChange={(e) => setPollDescription(e.target.value)}
                    placeholder="Poll description"
                    className="w-full h-24 p-2 border border-zinc-200 rounded bg-white text-zinc-900 placeholder:text-zinc-500"
                  />
                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                    <select
                      value={pollType}
                      onChange={(e) => setPollType(e.target.value as "single" | "multi")}
                      className="p-2 border border-zinc-200 rounded bg-white text-zinc-900"
                    >
                      <option value="single">Single choice</option>
                      <option value="multi">Multi choice</option>
                    </select>
                  </div>
                  <div className="mt-3 text-sm text-zinc-800">
                    <span className="text-gray-500 block mb-1">Set a start/end deadline?</span>
                    <label className="inline-flex items-center gap-1.5 mr-4">
                      <input
                        type="radio"
                        name="pollDeadline"
                        checked={pollDeadlineChoice === "yes"}
                        onChange={() => {
                          setPollDeadlineChoice("yes");
                        }}
                      />
                      Yes
                    </label>
                    <label className="inline-flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="pollDeadline"
                        checked={pollDeadlineChoice === "no"}
                        onChange={() => {
                          setPollDeadlineChoice("no");
                          setPollStart("");
                          setPollEnd("");
                        }}
                      />
                      No
                    </label>
                  </div>
                  {pollDeadlineChoice === "yes" && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input
                        type="datetime-local"
                        value={pollStart}
                        onChange={(e) => setPollStart(e.target.value)}
                        className="p-2 border border-zinc-200 rounded bg-white text-zinc-900"
                      />
                      <input
                        type="datetime-local"
                        value={pollEnd}
                        onChange={(e) => setPollEnd(e.target.value)}
                        className="p-2 border border-zinc-200 rounded bg-white text-zinc-900"
                      />
                    </div>
                  )}
                  <div className="mt-2 space-y-2">
                    {pollOptions.map((opt, idx) => (
                      <input
                        key={`opt-${idx}`}
                        type="text"
                        value={opt}
                        onChange={(e) =>
                          setPollOptions((prev) => prev.map((p, i) => (i === idx ? e.target.value : p)))
                        }
                        placeholder={`Option ${idx + 1}`}
                        className="w-full p-2 border border-zinc-200 rounded bg-white text-zinc-900 placeholder:text-zinc-500"
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => setPollOptions((prev) => [...prev, ""])}
                      className="px-3 py-1 bg-zinc-200 text-zinc-900 rounded hover:bg-zinc-300"
                    >
                      Add option
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    {pollStatus && <p className="text-sm text-zinc-600">{pollStatus}</p>}
                    <div className="ml-auto flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreatePollForm(false);
                          setPollStatus(null);
                        }}
                        className="px-4 py-2 bg-zinc-200 text-zinc-900 rounded hover:bg-zinc-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleCreatePoll}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Create Poll
                      </button>
                    </div>
                  </div>
                </div>
                )}

                <div className="space-y-3">
                  {filteredPolls.length === 0 && <p className="text-gray-400">No polls yet.</p>}
                  {filteredPolls.map((poll) => {
                    const tally = poll.tally?.length === poll.options.length
                      ? poll.tally
                      : new Array(poll.options.length).fill(0);
                    const selectedSet = new Set(
                      pollVotes[poll.id] ??
                        poll.currentUserChoices ??
                        []
                    );
                    const hasVoted =
                      Array.isArray(poll.currentUserChoices) &&
                      poll.currentUserChoices.length > 0;
                    const maxTally = Math.max(1, ...tally);
                    const pollMetaOpen =
                      pollDetailsPinnedId === poll.id || pollDetailsHoverId === poll.id;
                    const pollMetaText = [
                      poll.type === "single" ? "Single choice" : "Multi choice",
                      openEndedLabel(poll.startTime, poll.endTime),
                      `${poll.totalVotes ?? 0} ${(poll.totalVotes ?? 0) === 1 ? "response" : "responses"}`,
                    ].join(" • ");
                    return (
                    <div key={poll.id} className="relative border border-zinc-200 rounded-lg bg-zinc-50 p-3">
                      <div
                        className="absolute top-2 right-2 z-10 flex flex-col items-end"
                        data-poll-details-root={poll.id}
                        onMouseEnter={() => setPollDetailsHoverId(poll.id)}
                        onMouseLeave={() => setPollDetailsHoverId(null)}
                      >
                        <button
                          type="button"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-zinc-500 hover:bg-zinc-200/90 hover:text-zinc-900"
                          aria-label="Poll details"
                          aria-expanded={pollMetaOpen}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPollDetailsPinnedId((cur) =>
                              cur === poll.id ? null : poll.id
                            );
                          }}
                        >
                          <span className="text-xl leading-none" aria-hidden>
                            ⋯
                          </span>
                        </button>
                        {pollMetaOpen && (
                          <div
                            className="mt-1 w-[min(16rem,calc(100vw-3rem))] rounded-md border border-zinc-200 bg-white px-3 py-2 text-left text-xs leading-snug text-zinc-600 shadow-md"
                            role="region"
                            aria-label="Poll details"
                          >
                            {pollMetaText}
                          </div>
                        )}
                      </div>

                      <div className="pr-10">
                        <p className="text-xs text-gray-400">{new Date(poll.createdAt).toLocaleString()}</p>
                        <p className="mt-1 font-medium text-zinc-900">{poll.title}</p>
                        <p className="text-sm text-zinc-700 whitespace-pre-wrap">{poll.description}</p>
                      </div>

                      <div className="mt-2 space-y-1">
                        {poll.options.map((opt, idx) => {
                          const count = tally[idx] ?? 0;
                          const pct =
                            maxTally > 0 ? Math.round((count / maxTally) * 1000) / 10 : 0;
                          const selected = selectedSet.has(idx);
                          return (
                            <label
                              key={`${poll.id}-opt-${idx}`}
                              className="flex items-center gap-2 text-sm text-zinc-800 w-full"
                              title={`${count} ${opt}`}
                            >
                              <input
                                type={poll.type === "single" ? "radio" : "checkbox"}
                                name={`poll-${poll.id}`}
                                checked={selected}
                                onChange={(e) => {
                                  setPollVotes((prev) => {
                                    const base =
                                      prev[poll.id] ??
                                      (poll.currentUserChoices && poll.currentUserChoices.length > 0
                                        ? [...poll.currentUserChoices]
                                        : []);
                                    const current = [...base];
                                    if (poll.type === "single") {
                                      return { ...prev, [poll.id]: e.target.checked ? [idx] : [] };
                                    }
                                    if (e.target.checked) {
                                      return { ...prev, [poll.id]: [...new Set([...current, idx])] };
                                    }
                                    return {
                                      ...prev,
                                      [poll.id]: current.filter((v) => v !== idx),
                                    };
                                  });
                                }}
                              />
                              <span className="flex-1 min-w-0">{opt}</span>
                              <span className="flex shrink-0 items-center gap-1.5 self-center">
                                <span className="max-w-[10rem] text-right text-[11px] leading-tight text-zinc-500 tabular-nums">
                                  <span className="font-medium text-zinc-700">{count}</span>
                                  <span className="text-zinc-500"> </span>
                                  <span className="text-zinc-600">{opt}</span>
                                </span>
                                <div
                                  className="flex h-4 w-0.5 shrink-0 flex-col justify-end rounded-full bg-zinc-200 overflow-hidden"
                                  aria-hidden
                                >
                                  <div
                                    className={`w-full rounded-full transition-[height] duration-300 ease-out ${
                                      selected ? "bg-blue-600" : "bg-blue-500"
                                    }`}
                                    style={{
                                      height: `${pct}%`,
                                      minHeight: count > 0 ? "2px" : "0px",
                                    }}
                                  />
                                </div>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex flex-wrap justify-end gap-2">
                        {shareOrgSlug ? (
                          <OrgItemShareButton
                            orgPathSegment={shareOrgSlug}
                            kind="poll"
                            resourceId={poll.id}
                            title={poll.title}
                            description={poll.description}
                            isAdmin={isAdmin}
                            onPinToHomepage={pinContentToOrgHome}
                          />
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleVotePoll(poll.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          {hasVoted ? "Change Vote" : "Vote"}
                        </button>
                      </div>
                    </div>
                  );
                  })}
                </div>
              </div>
          </>
        )}

        {view === "settings" && orgKey && (
          <div className="space-y-4">
            <OrgSettingsPanel
              orgId={orgKey}
              governance={isGovernance}
              isAdmin={isAdmin}
              signedIn={Boolean(userId)}
              onSettingsChange={setOrgSettings}
            />
            {isAdmin && (
              <div className="border border-zinc-200 p-6 rounded bg-zinc-50">
                <h3 className="text-lg mb-3">Banner image</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!orgHomeBannerUrl.trim()) return;
                      setBannerEditorSource(orgHomeBannerUrl.trim());
                      setBannerEditorScale(1);
                      setBannerEditorOffset({ x: 0, y: 0 });
                      setShowBannerEditor(true);
                    }}
                    disabled={!orgHomeBannerUrl.trim()}
                    className="px-4 py-2 rounded bg-zinc-200 text-zinc-900 hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Edit banner
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrgHomeBannerUrl("")}
                    disabled={!orgHomeBannerUrl.trim()}
                    className="px-4 py-2 rounded bg-zinc-200 text-zinc-900 hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Remove banner
                  </button>
                </div>
              </div>
            )}
            <AuditorVisibilityCard isAdmin={isAdmin} org={orgRecord} onCommunityOrg={setOrgRecord} />
            <div className="border border-zinc-200 p-6 rounded bg-zinc-50">
              <h3 className="text-lg mb-2">Voting eligibility policy</h3>
              <p className="text-sm text-zinc-700">
                Eligibility criteria should be managed in admin settings (for example age thresholds, membership
                status, and verification requirements), not in the Create Vote form.
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                Next step: persist these policies and enforce them in vote and poll APIs.
              </p>
            </div>
          </div>
        )}

        {view === "votes" &&
          renderCommunityVotesMain(filteredVotesForVotesTab, {
            showSearch: true,
            searchValue: voteSearch,
            onSearchChange: setVoteSearch,
          })}

        {showInviteModal && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
            onClick={() => {
              setShowInviteModal(false);
              setInvitee(null);
              setInviteError("");
            }}
          >
            <div
              className="relative w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-5 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                aria-label="Close invite"
                onClick={() => {
                  setShowInviteModal(false);
                  setInvitee(null);
                  setInviteError("");
                }}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded bg-zinc-200 text-zinc-900 hover:bg-zinc-300"
              >
                ×
              </button>
              <h3 className="text-lg font-semibold text-zinc-900 pr-10">
                Invite to apply
              </h3>
              <p className="mt-1 text-sm text-zinc-600">
                They will get a notification to open the join application for this group. This does not approve
                membership.
              </p>
              <label className="mt-4 block text-sm font-medium text-zinc-800">
                Who
                <div className="mt-1">
                  <PersonPicker
                    value={invitee}
                    onChange={(id) => {
                      setInvitee(id);
                      setInviteError("");
                    }}
                    placeholder="Search by name or email"
                    exclude={[...members, ...(userId ? [userId] : [])]}
                  />
                </div>
              </label>
              {inviteError && <p className="mt-2 text-sm text-red-600">{inviteError}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInvitee(null);
                    setInviteError("");
                  }}
                  className="rounded bg-zinc-200 px-4 py-2 text-zinc-900 hover:bg-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={inviteSending || !userId || !invitee}
                  onClick={() => void handleSendInvite()}
                  className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {inviteSending ? "Sending…" : "Send invite"}
                </button>
              </div>
            </div>
          </div>
        )}

        {auditorReveal && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setAuditorReveal(null)}
          >
            <div
              className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-xl border border-zinc-200 bg-white p-6 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold text-zinc-900">{auditorReveal.title}</h2>
              <p className="mt-1 text-xs text-zinc-500">Counter review — this access is logged</p>
              <ul className="mt-4 divide-y divide-zinc-200 border border-zinc-200 rounded">
                {auditorReveal.ballots.length === 0 ? (
                  <li className="p-3 text-sm text-zinc-500">No ballots</li>
                ) : (
                  auditorReveal.ballots.map((b, i) => (
                    <li key={`${b.voterId}-${i}`} className="p-3 text-sm">
                      <p className="text-zinc-500">{nameOf(b.voterId)}</p>
                      <p className="mt-1 text-zinc-900">
                        {b.choices
                          .map((c) => auditorReveal.options[c] ?? `Option ${c}`)
                          .join(", ")}
                      </p>
                    </li>
                  ))
                )}
              </ul>
              <button
                type="button"
                onClick={() => setAuditorReveal(null)}
                className="mt-4 rounded bg-zinc-200 px-4 py-2 text-zinc-900 hover:bg-zinc-300"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {muteMemberModal && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setMuteMemberModal(null)}
          >
            <div
              className="relative w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                aria-label="Close mute dialog"
                onClick={() => setMuteMemberModal(null)}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded bg-zinc-200 text-zinc-900 hover:bg-zinc-300"
              >
                ×
              </button>
              <h3 className="pr-10 text-lg font-semibold text-zinc-900">Mute on messageboard</h3>
              <p className="mt-2 text-sm text-zinc-600">
                This person remains a full member (they cannot be removed from the group here). They only cannot post
                or react on the messageboard until the mute ends. Voting, events, and other activity are unchanged.
              </p>
              <p className="mt-2 text-xs text-zinc-500">{nameOf(muteMemberModal)}</p>
              <p className="mt-3 text-sm font-medium text-zinc-800">Duration</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(
                  [
                    { id: "1h" as const, label: "1 hour" },
                    { id: "24h" as const, label: "24 hours" },
                    { id: "7d" as const, label: "7 days" },
                    { id: "30d" as const, label: "30 days" },
                  ] as const
                ).map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMutePreset(id)}
                    className={`rounded border px-3 py-1.5 text-sm ${
                      mutePreset === id
                        ? "border-blue-600 bg-blue-50 text-blue-900"
                        : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setMutePreset("custom")}
                  className={`rounded border px-3 py-1.5 text-sm ${
                    mutePreset === "custom"
                      ? "border-blue-600 bg-blue-50 text-blue-900"
                      : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
                  }`}
                >
                  Custom
                </button>
              </div>
              {mutePreset === "custom" && (
                <label className="mt-3 block text-sm text-zinc-800">
                  Hours
                  <input
                    type="number"
                    min={1}
                    value={muteCustomHours}
                    onChange={(e) => setMuteCustomHours(e.target.value)}
                    className="mt-1 w-full rounded border border-zinc-200 p-2 text-zinc-900"
                  />
                </label>
              )}
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMuteMemberModal(null)}
                  className="rounded bg-zinc-200 px-4 py-2 text-zinc-900 hover:bg-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={muteSaving || !userId || !orgKey}
                  onClick={async () => {
                    if (!userId || !orgKey || !muteMemberModal) return;
                    setMuteSaving(true);
                    try {
                      const mutedUntil = Date.now() + computeMuteDurationMs(mutePreset, muteCustomHours);
                      const res = await fetch("/api/messageboard-mutes", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ orgKey, targetUser: muteMemberModal, mutedUntil }),
                      });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        alert(typeof data.error === "string" ? data.error : "Could not apply mute");
                        return;
                      }
                      setMuteMemberModal(null);
                      await loadMessageboardMuteState();
                    } catch {
                      alert("Could not apply mute. Check your connection and try again.");
                    } finally {
                      setMuteSaving(false);
                    }
                  }}
                  className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Apply mute
                </button>
              </div>
            </div>
          </div>
        )}
        <PerspectivesPanel
          open={Boolean(perspectivesVoteId)}
          education={voteEducation}
          loading={voteEducationLoading}
          onClose={() => setPerspectivesVoteId(null)}
          showAcknowledge={Boolean(
            perspectivesVoteId &&
              userId &&
              (isGovernance || orgSettings?.educationBeforeVote !== false) &&
              !communityEduAck[perspectivesVoteId]
          )}
          acknowledgeLabel="I have read these"
          acknowledgePending={false}
          onAcknowledge={() => {
            if (perspectivesVoteId) acknowledgeCommunityEducation(perspectivesVoteId);
          }}
        />
        </>
        )}
      </div>
    </div>
  );
}
