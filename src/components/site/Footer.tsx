import { Link } from "@tanstack/react-router";
import { GraduationCap, Phone, Mail, MapPin } from "lucide-react";
import { CRF_CONTACT } from "@/lib/brand";

export function Footer() {
  return (
    <footer className="bg-hero text-navy-foreground mt-20">
      <div className="mx-auto max-w-7xl px-4 py-14 grid md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="grid place-items-center h-9 w-9 rounded-lg bg-white/10">
              <GraduationCap className="h-5 w-5 text-gold" />
            </span>
            CRF Academy
          </div>
          <p className="mt-4 text-sm opacity-80 leading-relaxed">
            Craddle Reading Foundation Online Academy — Nigeria's premium online Nursery & Primary school.
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Explore</h4>
          <ul className="space-y-2 text-sm opacity-90">
            <li><Link to="/courses" className="hover:text-gold">All Courses</Link></li>
            <li><Link to="/summer" className="hover:text-gold">Summer Program</Link></li>
            <li><Link to="/admissions" className="hover:text-gold">Admissions</Link></li>
            <li><Link to="/about" className="hover:text-gold">About Us</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Get in touch</h4>
          <ul className="space-y-2 text-sm opacity-90">
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-gold" /> {CRF_CONTACT.phone1}</li>
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-gold" /> {CRF_CONTACT.phone2}</li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-gold" /> {CRF_CONTACT.email}</li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gold" /> Online — Nigeria</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Student support</h4>
          <p className="text-sm opacity-90">
            Call or WhatsApp us any day between 8 AM and 8 PM (WAT). We reply to every parent inquiry within 24 hours.
          </p>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs opacity-70">
        © {new Date().getFullYear()} {CRF_CONTACT.fullName}. All rights reserved.
      </div>
    </footer>
  );
}
