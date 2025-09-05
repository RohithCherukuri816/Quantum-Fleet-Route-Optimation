import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Users, Cpu, AlertTriangle, GanttChartSquare, Package, PackageX, Target } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const phases = [
  {
    phase: "Phase 1: Research & Planning",
    icon: GanttChartSquare,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    description: "Lay the groundwork for the project by defining the problem, selecting technologies, and planning resources. The goal is to establish a clear roadmap and ensure alignment among all stakeholders.",
    tasks: [
      "Formalize the Vehicle Routing Problem (VRP) for last-mile logistics.",
      "Select Quantum Algorithm (QAOA) and classical benchmarks (Google OR-Tools).",
      "Choose technology stack: IBM Qiskit, React, Node.js.",
      "Define MVP scope and create a detailed project timeline.",
      "Allocate personnel and define roles and responsibilities."
    ],
    deliverables: ["Project Charter", "Technical Specification Document", "Resource Allocation Plan"]
  },
  {
    phase: "Phase 2: Development & Integration",
    icon: Cpu,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    description: "Focus on building the core components of the system, including the quantum algorithm, data integrations, and the user interface for visualization.",
    tasks: [
      "Develop the QAOA algorithmic core using Qiskit.",
      "Integrate with free mapping APIs (OSRM, Nominatim) for routing and geocoding.",
      "Build the frontend UI for route visualization and interaction.",
      "Develop backend services for data processing and API management.",
      "Set up the database schema for storing demo runs and user data."
    ],
    deliverables: ["Functional QAOA Module", "Integrated Mapping Service", "Interactive UI Prototype"]
  },
  {
    phase: "Phase 3: Testing & Benchmarking",
    icon: CheckCircle,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
    description: "Rigorously test all components of the system and benchmark the quantum-enhanced solution against classical solvers to validate performance and identify areas for improvement.",
    tasks: [
      "Conduct unit, integration, and end-to-end testing.",
      "Benchmark QAOA performance against Google OR-Tools on standard VRP datasets.",
      "Analyze results to quantify quantum advantage/potential.",
      "Perform user acceptance testing (UAT) with a pilot group.",
      "Identify and log bugs and performance bottlenecks."
    ],
    deliverables: ["Comprehensive Test Report", "Benchmark Performance Analysis", "UAT Feedback Summary"]
  },
  {
    phase: "Phase 4: Deployment & Future Work",
    icon: Target,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    description: "Deploy a Minimum Viable Product (MVP) for public use and outline a strategic roadmap for future enhancements, scaling, and commercialization.",
    tasks: [
      "Deploy the MVP to a cloud environment (e.g., Vercel, AWS).",
      "Develop public-facing documentation and user guides.",
      "Monitor system performance and user feedback post-launch.",
      "Create a detailed roadmap for future features (e.g., real-time traffic, mobile apps).",
      "Explore commercialization strategies and potential partnerships."
    ],
    deliverables: ["Deployed MVP", "Public Documentation", "Future Product Roadmap"]
  }
];

const resources = [
    { category: "Personnel", resource: "Project Manager", details: "Oversees project, manages timeline and resources." },
    { category: "Personnel", resource: "Quantum Engineer", details: "Develops QAOA core with Qiskit, understands quantum computing principles." },
    { category: "Personnel", resource: "Full-Stack Developer", details: "Builds frontend (React) and backend (Node.js), manages APIs." },
    { category: "Personnel", resource: "UI/UX Designer", details: "Designs user interface and ensures a seamless user experience." },
    { category: "Technology", resource: "IBM Quantum Experience", details: "Access to quantum hardware and simulators via the cloud." },
    { category: "Technology", resource: "OSRM / Nominatim", details: "Free, open-source APIs for routing, geocoding, and mapping." },
    { category: "Technology", resource: "Google OR-Tools", details: "Classical solver for benchmarking and comparison." },
    { category: "Tools", resource: "Git & GitHub", details: "Version control and collaborative development." },
    { category: "Tools", resource: "Figma", details: "UI/UX design and prototyping." },
];

const risks = [
    { title: "Quantum Hardware Limitations", description: "Current NISQ-era devices have noise and limited qubits, which may affect the performance of the QAOA algorithm.", mitigation: "Utilize advanced Qiskit features for noise mitigation. Focus on hybrid algorithms that offload tasks to classical computers. Use simulators for larger problem sizes." },
    { title: "API Rate Limiting", description: "Free mapping and geocoding APIs (OSRM, Nominatim) may have usage limits that could be hit during extensive testing or high user traffic.", mitigation: "Implement caching for frequent requests. Design the system to handle API errors gracefully. Plan for a budget to switch to paid plans if necessary for scaling." },
    { title: "Algorithm Complexity", description: "Implementing and fine-tuning QAOA for VRP is non-trivial and may take longer than expected to achieve meaningful results.", mitigation: "Start with smaller, well-defined problem instances. Allocate extra time for research and development. Foster collaboration with the Qiskit community." },
    { title: "Integration Challenges", description: "Integrating the quantum backend with the classical frontend and external APIs can be complex, leading to unexpected bugs.", mitigation: "Conduct thorough integration testing at each step. Use a modular architecture to isolate components. Maintain clear API documentation between frontend and backend teams." },
];

const timeline = [
    { phase: "Phase 1", duration: "2 Weeks", milestones: "Project Kickoff, Tech Stack Finalized", deliverables: "Project Plan & Technical Specs" },
    { phase: "Phase 2", duration: "6 Weeks", milestones: "Alpha version of UI, Core algorithm implemented", deliverables: "Functional Prototype" },
    { phase: "Phase 3", duration: "3 Weeks", milestones: "Benchmarking complete, UAT started", deliverables: "Test & Benchmark Reports" },
    { phase: "Phase 4", duration: "1 Week", milestones: "MVP Deployed", deliverables: "Live MVP & Future Roadmap" },
];

export default function ProjectPlan() {
  return (
    <div className="bg-gray-50/50 min-h-screen">
      <header className="bg-gradient-to-br from-blue-50 via-white to-emerald-50 py-16 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <Badge variant="outline" className="px-4 py-2 text-blue-600 border-blue-200 bg-blue-50 mb-4">
            Project Management
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
            Q-Logic Routes: Project Plan
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            A comprehensive roadmap for developing a quantum-enhanced logistics optimization platform from scratch.
          </p>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* Project Overview */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-2xl">Project Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed">
              The Q-Logic Routes project aims to develop an innovative, AI-driven SaaS platform to solve complex last-mile delivery and vehicle routing problems (VRP). The core of this project is a hybrid quantum-classical approach, leveraging IBM's Qiskit and the Quantum Approximate Optimization Algorithm (QAOA) to find more efficient solutions than classical methods alone. The system will integrate with mapping APIs for real-time data and provide an intuitive web-based interface for users to plan, visualize, and optimize logistics operations.
            </p>
          </CardContent>
        </Card>

        {/* Scope Definition */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-2xl">Scope Definition</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center text-emerald-700">
                <Package className="w-6 h-6 mr-2" /> In-Scope
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>QAOA implementation for Vehicle Routing Problems.</li>
                <li>Integration with free mapping services (OSRM, Nominatim).</li>
                <li>Web-based UI for route planning and visualization.</li>
                <li>Benchmarking against classical solvers (Google OR-Tools).</li>
                <li>User data storage for demo runs and contact leads.</li>
                <li>Deployment of a publicly accessible MVP.</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center text-red-700">
                <PackageX className="w-6 h-6 mr-2" /> Out-of-Scope (for MVP)
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Full-scale commercial subscription and billing system.</li>
                <li>Native mobile applications for drivers/riders.</li>
                <li>Direct integration with proprietary logistics hardware.</li>
                <li>Advanced real-time traffic prediction models.</li>
                <li>Customer support beyond basic email contact.</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Project Phases */}
        <div>
            <h2 className="text-3xl font-bold text-center mb-8">Key Project Phases</h2>
            <div className="relative border-l-2 border-blue-200 ml-6">
            {phases.map((item, index) => {
                const Icon = item.icon;
                return (
                <div key={index} className="mb-10 ml-10">
                    <span className={`absolute -left-5 flex items-center justify-center w-10 h-10 ${item.bgColor} rounded-full ring-4 ring-white`}>
                        <Icon className={`w-5 h-5 ${item.color}`} />
                    </span>
                    <Card className="shadow-lg border-0">
                    <CardHeader>
                        <CardTitle className="text-xl">{item.phase}</CardTitle>
                        <p className="text-gray-600 text-sm">{item.description}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                        <h4 className="font-semibold mb-2">Key Tasks:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                            {item.tasks.map((task, i) => <li key={i}>{task}</li>)}
                        </ul>
                        </div>
                        <div>
                        <h4 className="font-semibold mb-2">Deliverables:</h4>
                        <div className="flex flex-wrap gap-2">
                            {item.deliverables.map((del, i) => <Badge key={i} variant="secondary">{del}</Badge>)}
                        </div>
                        </div>
                    </CardContent>
                    </Card>
                </div>
                );
            })}
            </div>
        </div>
        
        {/* Resources & Timeline */}
        <div className="grid lg:grid-cols-2 gap-8">
            <Card className="shadow-lg border-0">
                <CardHeader>
                    <CardTitle className="text-2xl flex items-center"><Users className="mr-2" /> Required Resources</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Category</TableHead>
                                <TableHead>Resource</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {resources.map(r => (
                                <TableRow key={r.resource}>
                                    <TableCell><Badge variant={r.category === 'Personnel' ? 'default' : 'outline'}>{r.category}</Badge></TableCell>
                                    <TableCell>
                                        <div className="font-medium">{r.resource}</div>
                                        <div className="text-xs text-gray-500">{r.details}</div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Card className="shadow-lg border-0">
                <CardHeader>
                    <CardTitle className="text-2xl flex items-center"><Clock className="mr-2" /> High-Level Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Phase</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>Deliverables</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {timeline.map(t => (
                                <TableRow key={t.phase}>
                                    <TableCell className="font-medium">{t.phase}</TableCell>
                                    <TableCell>{t.duration}</TableCell>
                                    <TableCell>{t.deliverables}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>

        {/* Risk Management */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center"><AlertTriangle className="mr-2 text-red-500"/> Risk Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {risks.map((risk, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="font-semibold text-left">{risk.title}</AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    <p><strong>Description:</strong> {risk.description}</p>
                    <p><strong>Mitigation Strategy:</strong> {risk.mitigation}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}