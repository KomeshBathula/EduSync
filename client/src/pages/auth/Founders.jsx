import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Github, Linkedin, BookOpen, ExternalLink } from 'lucide-react';

const Founders = () => {
    const navigate = useNavigate();
    
    const founders = [
        {
            name: "Komesh Bathula",
            role: "Co-Founder & Lead Architect",
            github: "https://github.com/komeshbathula",
            linkedin: "https://linkedin.com/in/komeshbathula",
            description: "Specializes in full-stack architecture and AI integration. Driven by creating seamless educational ecosystems."
        },
        {
            name: "Ramteja Kalluri",
            role: "Co-Founder & Product Designer",
            github: "https://github.com/ramtejakalluri",
            linkedin: "https://linkedin.com/in/ramtejakalluri",
            description: "Expert in human-centered design and adaptive learning systems. Focused on building calm and intuitive workspaces."
        },
        {
            name: "Jaideep Vantipalli",
            role: "Co-Founder & System Engineer",
            github: "https://github.com/jaideepvantipalli",
            linkedin: "https://linkedin.com/in/jaideepvantipalli",
            description: "Passionate about scalable system infrastructure and secure data management for educational platforms."
        }
    ];

    return (
        <div className="min-h-screen bg-background p-6 md:p-12 lg:p-20 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.02]" 
                 style={{ backgroundImage: 'linear-gradient(#1E3A8A 1px, transparent 1px), linear-gradient(90deg, #1E3A8A 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

            <div className="max-w-7xl mx-auto relative z-10">
                <button 
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-text-secondary hover:text-primary transition-all mb-12 group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-bold text-sm uppercase tracking-widest">Return to Portal</span>
                </button>

                <div className="mb-20 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20">
                            <BookOpen className="text-white w-7 h-7" />
                        </div>
                        <h1 className="text-3xl font-heading font-bold text-text-primary">EduSync<span className="text-primary">AI</span></h1>
                    </div>
                    <h2 className="text-5xl lg:text-7xl font-heading font-bold text-text-primary leading-tight max-w-4xl">
                        Meet the minds behind the <span className="text-primary">vision.</span>
                    </h2>
                    <p className="text-xl text-text-secondary mt-8 max-w-2xl leading-relaxed">
                        We are a team of passionate creators dedicated to redefining how intelligence and education intersect.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {founders.map((founder, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                            className="bg-surface border border-border-base rounded-3xl p-8 lg:p-10 shadow-sm hover:shadow-level-3 hover:-translate-y-2 transition-all group"
                        >
                            <div className="mb-8">
                                <h3 className="text-2xl lg:text-3xl font-heading font-bold text-text-primary group-hover:text-primary transition-colors">{founder.name}</h3>
                                <p className="text-primary font-bold text-sm uppercase tracking-wider mt-2">{founder.role}</p>
                            </div>
                            
                            <p className="text-text-secondary leading-relaxed mb-10 min-h-[80px]">
                                {founder.description}
                            </p>

                            <div className="flex gap-4 pt-6 border-t border-border-subtle">
                                <a 
                                    href={founder.github} target="_blank" rel="noopener noreferrer" 
                                    className="flex items-center gap-2 px-4 py-2 bg-surface-alt rounded-xl text-sm font-bold text-text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                                >
                                    <Github className="w-4 h-4" /> GitHub
                                </a>
                                <a 
                                    href={founder.linkedin} target="_blank" rel="noopener noreferrer" 
                                    className="flex items-center gap-2 px-4 py-2 bg-surface-alt rounded-xl text-sm font-bold text-text-primary hover:bg-[#0077b5] hover:text-white transition-all shadow-sm"
                                >
                                    <Linkedin className="w-4 h-4" /> LinkedIn
                                </a>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="mt-24 text-center">
                    <p className="text-text-secondary font-medium italic">"Building the future of learning, one layer at a time."</p>
                </div>
            </div>
        </div>
    );
};

export default Founders;
