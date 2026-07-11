import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Heart, Award, Users, Music, Camera, Palette, BookOpen, Drama, Mic2, Sparkles, Target, Eye, CheckCircle, Ticket, Star, MapPin } from "lucide-react";
import { Section } from "@/components/site/Section";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About TelentFest" },
      { name: "description", content: "Learn about TelentFest — a talent and training platform discovering and celebrating talent across Gujarat." },
    ],
  }),
  component: AboutPage,
});

const categories = [
  { icon: Mic2, label: "Singing" },
  { icon: Music, label: "Dancing" },
  { icon: Palette, label: "Music" },
  { icon: Drama, label: "Acting" },
  { icon: Camera, label: "Painting" },
  { icon: BookOpen, label: "Photography" },
  { icon: Sparkles, label: "Creative Writing" },
  { icon: Star, label: "Traditional Fashion Show" },
];

const whatWeDo = [
  { icon: Award, title: "Talent Competitions", desc: "Organize city-wise and state-level competitions across multiple performance categories." },
  { icon: BookOpen, title: "Training & Development", desc: "Provide guidance and mentorship to help participants refine their skills." },
  { icon: Music, title: "Live Events", desc: "Host live stage events that give artists real-world performance experience." },
  { icon: Star, title: "Artist Recognition", desc: "Celebrate and showcase talented individuals through awards and features." },
  { icon: Users, title: "Community Opportunities", desc: "Build a network of artists, mentors, and event organizers across Gujarat." },
  { icon: Ticket, title: "Participant Entry Passes", desc: "Issue secure digital entry passes for smooth event participation." },
  { icon: Heart, title: "Employee Awards", desc: "Recognize the dedicated team members who make every event possible." },
];

const whyChoose = [
  { icon: CheckCircle, title: "Professional Platform", desc: "A structured and trusted platform for talent discovery." },
  { icon: Users, title: "Multiple Talent Categories", desc: "Diverse categories so every participant finds their stage." },
  { icon: MapPin, title: "City-Wise Events", desc: "Events organized across Gujarat for wider accessibility." },
  { icon: Award, title: "Fair Participation Process", desc: "Transparent and equal opportunity for all participants." },
  { icon: Ticket, title: "Secure Digital Passes", desc: "Modern QR-coded entry passes for hassle-free check-in." },
  { icon: Star, title: "Opportunities for Recognition", desc: "Winners and participants get visibility and career opportunities." },
];

function AboutPage() {
  return (
    <>
      <Section
        eyebrow="About Us"
        title="About TelentFest"
        subtitle="A platform created to discover, encourage and celebrate talent across Gujarat."
      >
        <div className="mx-auto max-w-4xl space-y-16">
          {/* About */}
          <div className="space-y-4 text-center">
            <p className="text-lg leading-relaxed text-muted-foreground">
              TelentFest is a talent and training platform that provides opportunities to artists, performers, students and creative individuals. We organize events and competitions across Gujarat in categories including singing, dancing, music, acting, painting, photography, creative writing, traditional fashion show, and other talent categories.
            </p>
          </div>

          {/* Categories */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {categories.map((cat) => (
              <div key={cat.label} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl gradient-primary text-foreground">
                  <cat.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">{cat.label}</span>
              </div>
            ))}
          </div>

          {/* Mission & Vision */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-border bg-card p-8">
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl gradient-primary text-foreground">
                <Target className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">Our Mission</h3>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                Our mission is to identify hidden talent, provide professional opportunities and create a trusted platform where participants can confidently showcase their abilities.
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-8">
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl gradient-primary text-foreground">
                <Eye className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">Our Vision</h3>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                Our vision is to build one of Gujarat's most trusted talent-development platforms and connect talented individuals with audiences, mentors and meaningful opportunities.
              </p>
            </div>
          </div>

          {/* What We Do */}
          <div>
            <h2 className="mb-6 text-2xl font-bold text-center">What We Do</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {whatWeDo.map((item) => (
                <div key={item.title} className="rounded-2xl border border-border bg-card p-6 hover-lift">
                  <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl gradient-primary text-foreground">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Why Choose */}
          <div>
            <h2 className="mb-6 text-2xl font-bold text-center">Why Choose TelentFest</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {whyChoose.map((item) => (
                <div key={item.title} className="flex gap-3 rounded-2xl border border-border bg-card p-5">
                  <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-primary text-foreground">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{item.title}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Founder */}
          <div className="rounded-3xl border border-border bg-card p-8 text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full gradient-primary text-foreground text-3xl font-bold">
              JB
            </div>
            <h3 className="mt-4 text-xl font-bold">Mr. JB Ahir</h3>
            <p className="text-sm text-muted-foreground">Motivational Speaker and Founder of TelentFest</p>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="gradient-primary border-0 text-primary-foreground shadow-elegant">
              <Link to="/registration">
                Registration Form <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-foreground/35">
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
