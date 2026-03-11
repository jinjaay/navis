import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  promptLibrary,
  buildPreamble,
  categories,
  type PromptEntry,
  type PromptCategory,
} from "@/content/prompts";
import {
  ChatGPTIcon,
  GeminiIcon,
  ClaudeIcon,
  PerplexityIcon,
} from "@/components/ai-service-icons";
import { trackEvent } from "@/lib/analytics/analytics";
import { Effect } from "@/components/animate-ui/primitives/effects/effect";
import { Search, Copy, ChevronDown, ChevronLeft, ChevronRight, ArrowDown, Lightbulb, CheckCircle2, Variable } from "lucide-react";

const normalize = (value: string) => value.trim().toLowerCase();

const matchesSearch = (prompt: PromptEntry, query: string) => {
  if (!query) return true;
  const haystack = [prompt.title, prompt.summary, prompt.tags.join(" ")]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
};

const buildPromptText = (prompt: PromptEntry) => {
  const preamble = buildPreamble(prompt);
  const core = prompt.promptTemplate.trim();
  return [preamble, core].filter(Boolean).join("\n\n");
};

const extractExpectedSections = (template: string): string[] =>
  [...template.matchAll(/^\d+\.\s+(.+?):/gm)].map((m) => m[1].trim());

const aiServices = [
  {
    name: "ChatGPT",
    icon: ChatGPTIcon,
    buildUrl: (text: string) =>
      `https://chatgpt.com/?q=${encodeURIComponent(text)}`,
    prefills: true,
  },
  {
    name: "Gemini",
    label: "Paste in Gemini",
    icon: GeminiIcon,
    buildUrl: () => `https://gemini.google.com/app`,
    prefills: false,
  },
  {
    name: "Claude",
    icon: ClaudeIcon,
    buildUrl: (text: string) =>
      `https://claude.ai/new?q=${encodeURIComponent(text)}`,
    prefills: true,
  },
  {
    name: "Perplexity",
    icon: PerplexityIcon,
    buildUrl: (text: string) =>
      `https://www.perplexity.ai/?q=${encodeURIComponent(text)}`,
    prefills: true,
  },
] as const;

const usePromptActions = (prompt: PromptEntry) => {
  const text = buildPromptText(prompt);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      trackEvent({ name: "prompt_copy", payload: { slug: prompt.id } });
      toast.success("Prompt copied to clipboard");
    } catch {
      toast.error("Copy failed. Please try again.");
    }
  };

  const handleOpenIn = async (service: (typeof aiServices)[number]) => {
    const newTab = window.open(service.buildUrl(text), "_blank", "noreferrer");
    try {
      await navigator.clipboard.writeText(text);
      trackEvent({
        name: "outbound_click",
        payload: { slug: prompt.id, destination: service.name },
      });
      toast.success(
        service.prefills
          ? `Opening ${service.name}…`
          : `Prompt copied! Paste in ${service.name}.`
      );
    } catch {
      if (!newTab) {
        window.location.href = service.buildUrl(text);
      }
    }
  };

  return { handleCopy, handleOpenIn };
};

const PromptActions = ({
  prompt,
  size = "sm",
}: {
  prompt: PromptEntry;
  size?: "sm" | "default";
}) => {
  const { handleCopy, handleOpenIn } = usePromptActions(prompt);
  const isDefault = size === "default";

  return (
    <div className="flex w-full items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        className={`cursor-pointer hover-copy flex-1 gap-1.5 rounded-lg border border-border font-medium text-muted-foreground ${isDefault ? "h-9 text-xs sm:text-sm" : "h-8 text-[11px] sm:text-xs"}`}
        onClick={handleCopy}
      >
        <Copy className={isDefault ? "h-3.5 w-3.5 sm:h-4 sm:w-4" : "h-3 w-3 sm:h-3.5 sm:w-3.5"} />
        Copy
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            className={`cursor-pointer hover-open flex-1 gap-1.5 rounded-lg bg-[#ff3407] font-medium text-white transition-all ${isDefault ? "h-9 text-xs sm:text-sm" : "h-8 text-[11px] sm:text-xs"}`}
          >
            Use in
            <ChevronDown className={isDefault ? "h-3.5 w-3.5 opacity-70" : "h-3 w-3 opacity-70 sm:h-3.5 sm:w-3.5"} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-44 rounded-xl border-border p-1 shadow-lg"
        >
          {aiServices.map((service) => (
            <DropdownMenuItem
              key={service.name}
              className="cursor-pointer gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground focus:bg-primary/5 focus:text-primary"
              onClick={() => handleOpenIn(service)}
            >
              <service.icon className="h-4 w-4" />
              {"label" in service ? service.label : service.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

const PromptDetailDialog = ({
  prompt,
  open,
  onOpenChange,
}: {
  prompt: PromptEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const sections = extractExpectedSections(prompt.promptTemplate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden rounded-2xl p-0 sm:max-w-2xl">
        <div className="flex-1 overflow-y-auto p-6 pb-4">
          <DialogHeader className="gap-2">
            <div className="flex items-start justify-between gap-3 pr-6">
              <DialogTitle className="text-lg font-bold leading-snug tracking-tight sm:text-xl">
                {prompt.title}
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="rounded-full text-[11px] font-medium">
                {prompt.category}
              </Badge>
            </div>
            <DialogDescription className="text-sm leading-relaxed">
              {prompt.summary}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-5">
            {sections.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Lightbulb className="h-4 w-4 text-[#ff3407]" />
                  What you'll get
                </h3>
                <ol className="space-y-1.5 pl-1">
                  {sections.map((section, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-[#ff3407]">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{section}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {prompt.whenToUse && prompt.whenToUse.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-[#ff3407]" />
                  When to use
                </h3>
                <ul className="space-y-1.5 pl-1">
                  {prompt.whenToUse.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {prompt.variables && prompt.variables.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Variable className="h-4 w-4 text-[#ff3407]" />
                  You'll fill in
                </h3>
                <div className="flex flex-wrap gap-2">
                  {prompt.variables.map((v) => (
                    <Badge
                      key={v.key}
                      variant="outline"
                      className="rounded-full px-3 py-1 text-xs font-normal text-muted-foreground"
                    >
                      {v.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="relative sticky bottom-0 bg-background px-6 pb-4 before:pointer-events-none before:absolute before:inset-x-0 before:-top-8 before:h-8 before:bg-gradient-to-t before:from-background before:to-transparent sm:flex-row">
          <PromptActions prompt={prompt} size="default" />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const PromptCard = ({ prompt }: { prompt: PromptEntry }) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Card className="hover-card flex h-[180px] w-[260px] shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-200 sm:h-[200px] sm:w-[300px]">
        <CardHeader
          className="cursor-pointer gap-1.5 px-4 pb-0 pt-3 sm:px-5 sm:pt-4"
          onClick={() => {
            setDialogOpen(true);
            trackEvent({ name: "prompt_view", payload: { slug: prompt.id } });
          }}
        >
          <CardTitle className="line-clamp-2 text-[15px] font-bold leading-snug tracking-tight text-card-foreground sm:text-base">
            {prompt.title}
          </CardTitle>
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {prompt.summary}
          </p>
        </CardHeader>
        <CardFooter className="mt-auto px-4 pb-3 pt-3 sm:px-5 sm:pb-4">
          <PromptActions prompt={prompt} />
        </CardFooter>
      </Card>
      <PromptDetailDialog
        prompt={prompt}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
};

const categoryAnchorId = (cat: PromptCategory) =>
  cat.toLowerCase().replace(/[^a-z0-9]+/g, "-");

const categoryDisplayLabel: Record<PromptCategory, string> = {
  Itinerary: "Build Your Itinerary",
  Stays: "Where to Stay",
  "Food & Drink": "Eat & Drink Like a Local",
  Routes: "Routes & Getting Around",
  Discovery: "Discover Hidden Gems",
  "Smart Planning": "Smart Travel Planning",
};

const CategoryRow = ({
  category,
  prompts,
}: {
  category: PromptCategory;
  prompts: PromptEntry[];
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState, prompts]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  if (prompts.length === 0) return null;

  return (
    <div id={categoryAnchorId(category)} className="scroll-mt-28 sm:scroll-mt-24">
      <Effect
        inView
        inViewOnce
        inViewMargin="-40px"
        fade
        slide={{ direction: "up", offset: 24 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="mb-3 flex items-center justify-between px-6 sm:mb-4 sm:px-10">
          <h2 className="text-lg font-bold tracking-tight text-[#ff3407] sm:text-xl">
            {categoryDisplayLabel[category]}
          </h2>
          <span className="text-xs text-muted-foreground sm:text-sm">
            {prompts.length} prompt{prompts.length !== 1 && "s"}
          </span>
        </div>
      </Effect>

      <Effect
        inView
        inViewOnce
        inViewMargin="-20px"
        fade
        slide={{ direction: "up", offset: 32 }}
        delay={80}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
      >
        <div className="group relative">
          {canScrollLeft && (
            <button
              onClick={() => scroll("left")}
              className="absolute left-0 top-0 z-10 hidden h-full w-10 cursor-pointer items-center justify-center bg-gradient-to-r from-background/90 to-transparent transition-opacity sm:flex"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            </button>
          )}

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto px-6 pb-2 scrollbar-hide sm:gap-5 sm:px-10"
          >
            {prompts.map((prompt) => (
              <PromptCard key={prompt.id} prompt={prompt} />
            ))}
          </div>

          {canScrollRight && (
            <button
              onClick={() => scroll("right")}
              className="absolute right-0 top-0 z-10 hidden h-full w-10 cursor-pointer items-center justify-center bg-gradient-to-l from-background/90 to-transparent transition-opacity sm:flex"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          )}
        </div>
      </Effect>
    </div>
  );
};

const TypingText = () => {
  const phrases = [
    "Discover where to go next",
    "Compare destinations",
    "Find hidden gems",
    "Deep-dive into the culture",
    "Get a trip plan in minutes",
    "Find the best food",
  ];

  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const currentPhrase = phrases[currentPhraseIndex];

    if (isPaused) {
      const pauseTimer = setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
      }, 2000);
      return () => clearTimeout(pauseTimer);
    }

    if (!isDeleting && displayText === currentPhrase) {
      setIsPaused(true);
      return;
    }

    if (isDeleting && displayText === "") {
      setIsDeleting(false);
      setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
      return;
    }

    const timeout = setTimeout(() => {
      setDisplayText((prev) => {
        if (isDeleting) {
          return currentPhrase.substring(0, prev.length - 1);
        } else {
          return currentPhrase.substring(0, prev.length + 1);
        }
      });
    }, isDeleting ? 20 : 50);

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, isPaused, currentPhraseIndex]);

  return (
    <>
      {displayText}
      <span className="animate-pulse">|</span>
    </>
  );
};

interface PromptsIndexProps {
  search: string;
  setSearch: (value: string) => void;
}

export const PromptsIndex = ({ search, setSearch }: PromptsIndexProps) => {
  const cardsRef = useRef<HTMLDivElement>(null);

  const promptsByCategory = useMemo(() => {
    const query = normalize(search);
    return categories.map((cat) => ({
      category: cat,
      prompts: promptLibrary.filter(
        (p) => p.category === cat && matchesSearch(p, query)
      ),
    }));
  }, [search]);

  const totalMatches = promptsByCategory.reduce(
    (sum, row) => sum + row.prompts.length,
    0
  );

  return (
    <div className="flex flex-col pb-16 sm:pb-24">
      {/* Hero */}
      <section className="relative overflow-hidden bg-secondary/50 px-4 pt-16 pb-6 sm:px-6 sm:pt-24 sm:pb-10 lg:pt-28 lg:pb-12">
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 1440 800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <style>{`
              @keyframes dash-flow {
                to { stroke-dashoffset: -200; }
              }
              @keyframes dash-flow-reverse {
                to { stroke-dashoffset: 200; }
              }
              @keyframes circle-pulse {
                0%, 100% { opacity: 0.6; }
                50% { opacity: 1; }
              }
              @keyframes dot-pulse {
                0%, 100% { opacity: 0.5; }
                50% { opacity: 1; }
              }
              .flow-1 {
                stroke-dasharray: 120 80;
                animation: dash-flow 10s linear infinite;
              }
              .flow-3 {
                stroke-dasharray: 140 60;
                animation: dash-flow-reverse 12s linear infinite;
              }
              .circle-breathe-1 {
                animation: circle-pulse 8s ease-in-out infinite;
              }
              .circle-breathe-3 {
                animation: circle-pulse 9s ease-in-out infinite 2s;
              }
              .dot-glow-1 {
                animation: dot-pulse 4s ease-in-out infinite;
              }
              .dot-glow-3 {
                animation: dot-pulse 5s ease-in-out infinite 1s;
              }
              .dot-glow-4 {
                animation: dot-pulse 4.5s ease-in-out infinite 2s;
              }
            `}</style>
          </defs>

          <path
            className="flow-1"
            d="M-100 600 C200 450, 500 700, 720 400 S1100 200, 1540 350"
            stroke="#ff3407"
            strokeWidth="1.5"
            strokeOpacity="0.162"
            fill="none"
          />
          <path
            className="flow-3"
            d="M-100 200 C150 350, 400 100, 720 300 S1050 500, 1540 250"
            stroke="#ff3407"
            strokeWidth="1.5"
            strokeOpacity="0.135"
            fill="none"
          />

          <circle className="circle-breathe-1" cx="200" cy="200" r="120" stroke="#ff3407" strokeWidth="0.8" strokeOpacity="0.135" fill="none" />
          <circle className="circle-breathe-3" cx="1250" cy="550" r="100" stroke="#ff3407" strokeWidth="0.8" strokeOpacity="0.08" fill="none" />

          <circle className="dot-glow-1" cx="720" cy="400" r="3" fill="#ff3407" fillOpacity="0.225" />
          <circle className="dot-glow-3" cx="200" cy="200" r="2.5" fill="#ff3407" fillOpacity="0.225" />
          <circle className="dot-glow-4" cx="1250" cy="550" r="2.5" fill="#ff3407" fillOpacity="0.14" />

        </svg>
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_55%,transparent_100%)]" />
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center text-center relative z-10">
          <h1 className="mt-5 max-w-4xl text-3xl font-extrabold tracking-tight text-foreground sm:mt-7 sm:text-5xl md:text-6xl">
            <span className="block bg-gradient-to-r from-[#ff3407] to-[#ffd6cd] bg-clip-text text-transparent min-h-[1.2em]">
              <TypingText />
            </span>
            <span className="block mt-1 sm:mt-2">with Paiko</span>
          </h1>

          <p className="mt-4 max-w-sm sm:max-w-xl text-sm leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg sm:leading-relaxed">
            Your prompt travel guide. Structured prompts that get you detailed, useful answers with no back-and-forth needed
          </p>

          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Button
              size="lg"
              variant="outline"
              className="group cursor-pointer gap-2 rounded-full border-primary/20 bg-primary/5 px-8 py-3 text-sm font-medium text-primary shadow-none transition-all hover:bg-primary/10 hover:border-primary/30 hover:text-primary sm:px-10 sm:py-3.5 sm:text-base"
              onClick={() => {
                cardsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              Explore prompts
              <ArrowDown className="animate-bounce h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="cursor-pointer gap-2 rounded-full border-border px-8 py-3 text-sm font-medium text-muted-foreground shadow-none transition-all hover:bg-accent hover:border-border hover:text-foreground sm:px-10 sm:py-3.5 sm:text-base"
              asChild
            >
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSf0sfiESG6UJGv8-p8eJKszaf7qKcUu4VF_1OWEG98uYD7DKA/viewform"
                target="_blank"
                rel="noopener noreferrer"
              >
                Share feedback
              </a>
            </Button>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-background pointer-events-none" />
      </section>

      {/* Category Rows */}
      <section ref={cardsRef} className="scroll-mt-28 mx-auto flex w-full max-w-7xl flex-col gap-8 pt-6 sm:scroll-mt-24 sm:gap-12 sm:pt-8">
        {totalMatches > 0 ? (
          promptsByCategory.map(({ category: cat, prompts }) => (
            <CategoryRow key={cat} category={cat} prompts={prompts} />
          ))
        ) : (
          <div className="mx-4 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 bg-secondary/50 px-4 py-16 text-center sm:mx-6 sm:gap-4 sm:rounded-3xl sm:py-24">
            <div className="rounded-full bg-muted p-3 sm:p-4">
              <Search className="h-6 w-6 text-muted-foreground/50 sm:h-8 sm:w-8" />
            </div>
            <div className="max-w-md space-y-1.5 sm:space-y-2">
              <h3 className="text-lg font-semibold text-foreground sm:text-xl">No prompts found</h3>
              <p className="text-sm text-muted-foreground sm:text-base">
                We couldn't find any prompts matching "{search}". Try adjusting your search.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setSearch("")}
              className="cursor-pointer mt-2 rounded-full text-sm sm:mt-4"
            >
              Clear search
            </Button>
          </div>
        )}

        {totalMatches > 0 && (
          <Effect
            inView
            inViewOnce
            inViewMargin="-20px"
            fade
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
          >
            <div className="flex items-center justify-center pb-2 sm:pb-4">
              <p className="text-xs text-muted-foreground sm:text-sm">
                Showing <span className="font-semibold text-foreground">{totalMatches}</span> prompt{totalMatches !== 1 && "s"} across {promptsByCategory.filter((r) => r.prompts.length > 0).length} categories
              </p>
            </div>
          </Effect>
        )}
      </section>
    </div>
  );
};
