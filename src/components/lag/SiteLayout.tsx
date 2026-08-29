import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Gamepad2,
  Heart,
  Home,
  Instagram,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Monitor,
  Moon,
  Search,
  ShieldCheck,
  Sun,
  Tag,
  Tv,
  User,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { FloatingWhatsApp } from "@/components/lag/FloatingWhatsApp";
import { SearchDialog } from "@/components/lag/SearchDialog";
import { Logo } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { instagramUrl, whatsappLink } from "@/lib/lag";
import { contactFrom, settingsQuery } from "@/lib/queries";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/games", label: "Games" },
  { to: "/deals", label: "Deals" },
  { to: "/upcoming-games", label: "Upcoming Games" },
  { to: "/ps-plus", label: "PS Plus" },
  { to: "/ott", label: "OTT" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/reviews", label: "Reviews" },
  { to: "/about", label: "About Us" },
  { to: "/contact", label: "Contact" },
] as const;

/** Desktop bar keeps a shorter set; the hamburger holds everything. */
const DESKTOP_NAV = NAV.filter((i) => i.label !== "About Us");

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <BackdropGlow />
      <Header />
      <main className="relative w-full min-w-0 flex-1 pb-28 md:pb-0">{children}</main>
      <Footer />
      <FloatingWhatsApp />
      <MobileTabBar />
    </div>
  );
}

function BackdropGlow() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -left-32 h-[26rem] w-[26rem] rounded-full bg-lag-red/12 blur-[120px]" />
      <div className="absolute top-1/3 -right-40 h-[30rem] w-[30rem] rounded-full bg-lag-blue/12 blur-[130px]" />
    </div>
  );
}

function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { user, profile, isAdmin, signOut } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 px-3 pt-3 sm:px-5">
        <div
          className={cn(
            "glass-strong mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl transition-all duration-300 lg:grid-cols-[auto_minmax(0,1fr)_auto]",
            scrolled ? "px-3 py-2" : "px-4 py-3",
          )}
        >
          <Logo />

          <nav aria-label="Main" className="hidden justify-center gap-1 lg:flex">
            {DESKTOP_NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{ className: "text-foreground bg-accent" }}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <Button
              variant="nav"
              size="icon"
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
              className="h-9 w-9"
            >
              <Search className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              variant="nav"
              size="icon"
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              onClick={toggle}
              className="h-9 w-9"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" aria-hidden />
              ) : (
                <Moon className="h-4 w-4" aria-hidden />
              )}
            </Button>
            <Button asChild variant="nav" size="icon" className="h-9 w-9" aria-label="Admin">
              <Link to={isAdmin ? "/admin" : "/admin/login"}>
                <ShieldCheck className="h-4 w-4 text-lag-blue" aria-hidden />
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="nav" size="icon" className="h-9 w-9" aria-label="Account">
                  <User className="h-4 w-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-strong w-52">
                {user ? (
                  <>
                    <DropdownMenuLabel className="truncate">
                      {profile?.full_name || user.email}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/account">My Account</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/wishlist">My Wishlist</Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin">Admin Dashboard</Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => void signOut()}>
                      <LogOut className="mr-2 h-4 w-4" aria-hidden /> Sign out
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/login">Login</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/register">Create account</Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="nav"
              size="icon"
              className="h-9 w-9 lg:hidden"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
            </Button>
          </div>
        </div>

        {menuOpen && (
          <nav
            aria-label="Mobile"
            className="glass-strong mx-auto mt-2 max-w-7xl rounded-2xl p-2 lg:hidden"
          >
            {[
              ...NAV,
              ...(user
                ? [
                    { to: "/account", label: "My Account" },
                    { to: "/wishlist", label: "Wishlist" },
                  ]
                : [
                    { to: "/login", label: "Login" },
                    { to: "/register", label: "Create Account" },
                  ]),
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{ className: "text-foreground bg-accent" }}
                className="block rounded-xl px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            {user && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  void signOut();
                }}
                className="block w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-lag-red transition-colors hover:bg-accent"
              >
                Logout
              </button>
            )}
          </nav>
        )}
      </header>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}

function MobileTabBar() {
  const items = [
    { to: "/", label: "Home", icon: Home },
    { to: "/games", label: "Games", icon: Gamepad2 },
    { to: "/deals", label: "Deals", icon: Tag },
    { to: "/ps-plus", label: "PS Plus", icon: Monitor },
    { to: "/account", label: "Account", icon: User },
  ] as const;
  return (
    <nav
      aria-label="Quick navigation"
      className="glass-strong fixed bottom-3 left-3 right-3 z-50 grid grid-cols-5 rounded-2xl px-1 py-1.5 md:hidden"
    >
      {items.map((item) => (
        <Link
          key={item.label}
          to={item.to}
          activeOptions={{ exact: item.to === "/" }}
          activeProps={{ className: "text-lag-red" }}
          className="flex flex-col items-center gap-1 rounded-xl py-1 text-[10px] font-bold text-muted-foreground"
        >
          <item.icon className="h-4.5 w-4.5" aria-hidden />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function Footer() {
  const { data: settings } = useQuery(settingsQuery);
  const contact = contactFrom(settings);
  const note = (settings?.["footer"]?.["note"] as string | undefined) ?? "";

  return (
    <footer className="relative mt-20 border-t border-border px-4 pt-14 pb-10 sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 font-display text-sm font-bold tracking-wide text-lag-red">
            {contact.tagline}
          </p>
          {note && <p className="mt-3 text-xs text-muted-foreground">{note}</p>}
        </div>

        <FooterCol title="Explore">
          {NAV.map((i) => (
            <Link key={i.to} to={i.to} className="hover:text-foreground">
              {i.label}
            </Link>
          ))}
        </FooterCol>

        <FooterCol title="Support">
          <a href={whatsappLink(contact.whatsapp, "Hi LAG, I need help.")} className="hover:text-foreground">
            WhatsApp {contact.whatsapp_display}
          </a>
          <a href={instagramUrl(contact.instagram)} className="hover:text-foreground">
            Instagram @{contact.instagram.replace(/^@/, "")}
          </a>
          <a href={contact.whatsapp_group} className="hover:text-foreground">
            Join WhatsApp Group
          </a>
        </FooterCol>

        <FooterCol title="Legal">
          <Link to="/policies" hash="terms" className="hover:text-foreground">
            Terms &amp; Conditions
          </Link>
          <Link to="/policies" hash="privacy" className="hover:text-foreground">
            Privacy Policy
          </Link>
          <Link to="/policies" hash="refund" className="hover:text-foreground">
            Refund Policy
          </Link>
        </FooterCol>
      </div>

      <div className="mx-auto mt-12 flex max-w-7xl flex-col items-center gap-4 border-t border-border pt-6 sm:flex-row sm:justify-between">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} {contact.brand}. All rights reserved.
        </p>
        <div className="flex gap-2">
          <IconLink href={whatsappLink(contact.whatsapp, "Hi LAG 👋")} label="WhatsApp" icon={MessageCircle} />
          <IconLink href={instagramUrl(contact.instagram)} label="Instagram" icon={Instagram} />
          <IconLink href={contact.whatsapp_group} label="WhatsApp Group" icon={Users} />
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-[11px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
        {title}
      </h3>
      <div className="flex flex-col gap-2 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

function IconLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof Instagram;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={label}
      className="glass grid h-10 w-10 place-items-center rounded-xl transition-colors hover:text-lag-red"
    >
      <Icon className="h-4 w-4" aria-hidden />
    </a>
  );
}

export { Heart, Gamepad2, LayoutDashboard };
