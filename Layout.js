import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Menu, X, Truck, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigationItems = [
    { title: "Use Cases", href: "#features" },
    { title: "Pricing", href: "#pricing" },
    {
      title: "Resources",
      dropdown: [
        { title: "About Qiskit", href: "#qiskit" },
        { title: "Team", href: "#team" },
        { title: "Project Plan", href: createPageUrl("ProjectPlan"), isPage: true },
      ]
    },
    { title: "Contact", href: "#contact" },
  ];

  const handleNavClick = (href, isPage) => {
    if (isPage) {
      // It's a page link, handled by <Link>
      setIsMobileMenuOpen(false);
    } else {
      // It's a scroll-to link
      const element = document.getElementById(href.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
    setIsMobileMenuOpen(false);
  };


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to={createPageUrl("Home")} className="flex items-center space-x-2 cursor-pointer">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-emerald-500 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">
                Q-Logic Routes
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-8">
              {navigationItems.map((item) => (
                <div key={item.title}>
                  {item.dropdown ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition-colors font-medium outline-none">
                        <span>{item.title}</span>
                        <ChevronDown className="w-4 h-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        {item.dropdown.map((subItem) => (
                           <DropdownMenuItem key={subItem.title} asChild>
                            {subItem.isPage ? (
                              <Link to={subItem.href} className="cursor-pointer w-full">{subItem.title}</Link>
                            ) : (
                              <button onClick={() => handleNavClick(subItem.href, false)} className="cursor-pointer text-left w-full">{subItem.title}</button>
                            )}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <button
                      onClick={() => handleNavClick(item.href, false)}
                      className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
                    >
                      {item.title}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <div className="hidden lg:block">
              <Button 
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                onClick={() => handleNavClick('#demo', false)}
              >
                Try Live Demo
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-gray-700 hover:text-blue-600 p-2"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-gray-200 shadow-lg">
            <div className="px-4 py-2 space-y-1">
              {navigationItems.map((item) => (
                <div key={item.title}>
                  {item.dropdown ? (
                    <div className="py-2">
                      <div className="font-medium text-gray-900 mb-2">{item.title}</div>
                      {item.dropdown.map((subItem) => (
                         subItem.isPage ? (
                          <Link key={subItem.title} to={subItem.href} onClick={() => handleNavClick(subItem.href, true)} className="block w-full text-left px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md">
                            {subItem.title}
                          </Link>
                        ) : (
                          <button
                            key={subItem.title}
                            onClick={() => handleNavClick(subItem.href, false)}
                            className="block w-full text-left px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                          >
                            {subItem.title}
                          </button>
                        )
                      ))}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleNavClick(item.href, false)}
                      className="block w-full text-left px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md font-medium"
                    >
                      {item.title}
                    </button>
                  )}
                </div>
              ))}
              <div className="pt-4 pb-2">
                <Button 
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700"
                  onClick={() => handleNavClick('#demo', false)}
                >
                  Try Live Demo
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main>
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <Truck className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">Q-Logic Routes</span>
              </div>
              <p className="text-gray-400 text-sm">
                Unified last-mile logistics platform optimizing delivery operations across India.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><button onClick={() => handleNavClick('#features', false)} className="hover:text-white transition-colors">Features</button></li>
                <li><button onClick={() => handleNavClick('#pricing', false)} className="hover:text-white transition-colors">Pricing</button></li>
                <li><button onClick={() => handleNavClick('#demo', false)} className="hover:text-white transition-colors">Live Demo</button></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><button onClick={() => handleNavClick('#team', false)} className="hover:text-white transition-colors">Team</button></li>
                <li><button onClick={() => handleNavClick('#qiskit', false)} className="hover:text-white transition-colors">About Qiskit</button></li>
                <li><button onClick={() => handleNavClick('#contact', false)} className="hover:text-white transition-colors">Contact</button></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to={createPageUrl("ProjectPlan")} className="hover:text-white transition-colors">Project Plan</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">Whitepaper</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>Made with ♥ by Team BWEC for Amaravati Quantum Valley Hackathon</p>
          </div>
        </div>
      </footer>
    </div>
  );
}