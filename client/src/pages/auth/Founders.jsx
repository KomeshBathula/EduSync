import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Github, Linkedin, Sparkles, BookOpen, BrainCircuit, ArrowUpRight } from 'lucide-react';

const Founders = () => {
    const navigate = useNavigate();
    
    const founders = [
        {
            id: '01',
            name: "Komesh Bathula",
            role: "Co-Founder & Lead Architect",
            github: "https://github.com/komeshbathula",
            linkedin: "https://linkedin.com/in/komeshbathula",
            description: "Specializes in full-stack architecture and AI integration. Driven by creating seamless educational ecosystems.",
            specialties: ["Platform Architecture", "AI Integration", "Scalable APIs"],
            Icon: BookOpen,
            tone: "from-primary/25 via-primary/5 to-transparent"
        },
        {
            id: '02',
            name: "Ramteja Kalluri",
            role: "Co-Founder & Product Designer",
            github: "https://github.com/ramtejakalluri",
            linkedin: "https://linkedin.com/in/ramtejakalluri",
            description: "Expert in human-centered design and adaptive learning systems. Focused on building calm and intuitive workspaces.",
            specialties: ["Experience Design", "Adaptive Workflows", "Product Strategy"],
            Icon: Sparkles,
            tone: "from-accent-base/30 via-accent-base/10 to-transparent"
        },
        {
            id: '03',
            name: "Jaideep Vantipalli",
            role: "Co-Founder & System Engineer",
            github: "https://github.com/jaideepvantipalli",
            linkedin: "https://linkedin.com/in/jaideepvantipalli",
            description: "Passionate about scalable system infrastructure and secure data management for educational platforms.",
            specialties: ["Infrastructure", "Security", "Reliability"],
            Icon: BrainCircuit,
            tone: "from-secondary-base/30 via-secondary-base/10 to-transparent"
        }
    ];

    return (
        <div className="min-h-screen bg-background text-text-primary relative overflow-hidden py-8 md:py-12 px-5 md:px-10 lg:px-16">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-28 -left-28 w-96 h-96 rounded-full bg-primary/15 blur-[130px]"></div>
                <div className="absolute top-20 right-0 w-[26rem] h-[26rem] rounded-full bg-secondary-base/15 blur-[140px]"></div>
                <div className="absolute bottom-[-6rem] left-1/3 w-[28rem] h-[28rem] rounded-full bg-accent-base/15 blur-[150px]"></div>
                <div
                    className="absolute inset-0 opacity-[0.04] dark:opacity-[0.07]"
                    style={{
                        backgroundImage:
                            'radial-gradient(circle at 1px 1px, var(--color-primary-base) 1px, transparent 0)',
                        backgroundSize: '32px 32px'
                    }}
                />
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                <button
                    onClick={() => navigate(-1)}
                    className="group inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full border border-border-base bg-surface/90 backdrop-blur text-sm font-semibold text-text-secondary hover:text-primary hover:border-primary/40 hover:shadow-level-1 transition-all mb-10"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Return to Portal
                </button>

                <section className="grid lg:grid-cols-12 gap-8 lg:gap-12 mb-14">
                    <div className="lg:col-span-7">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/25 bg-primary/10 text-primary text-xs font-bold tracking-[0.16em] uppercase mb-6">
                            <Sparkles className="w-3.5 h-3.5" />
                            Founding Studio
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold leading-[1.03]">
                            Crafted by founders who build
                            <span className="block mt-2 bg-gradient-to-r from-primary via-secondary-base to-accent-base text-transparent bg-clip-text">
                                intelligence with intention
                            </span>
                        </h1>

                        <p className="text-lg text-text-secondary mt-7 max-w-2xl leading-relaxed">
                            EduSync is designed at the intersection of engineering precision and educational empathy. Meet the three builders translating that vision into a living platform.
                        </p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="lg:col-span-5"
                    >
                        <div className="relative h-full min-h-[280px] rounded-[30px] border border-border-base bg-surface/90 backdrop-blur-sm p-6 overflow-hidden shadow-level-2">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-secondary-base/15"></div>
                            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(135deg, transparent 0%, transparent 47%, var(--color-border-base) 50%, transparent 53%, transparent 100%)', backgroundSize: '22px 22px' }}></div>

                            <div className="relative h-full flex flex-col justify-between">
                                <div className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary">
                                    <BookOpen className="w-4 h-4 text-primary" />
                                    EduSync Collective
                                </div>

                                <div className="flex items-center justify-center py-6">
                                    <div className="relative w-44 h-44">
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ repeat: Infinity, duration: 18, ease: 'linear' }}
                                            className="absolute inset-0 rounded-full border border-primary/35"
                                        />
                                        <motion.div
                                            animate={{ rotate: -360 }}
                                            transition={{ repeat: Infinity, duration: 26, ease: 'linear' }}
                                            className="absolute inset-[14px] rounded-full border border-secondary-base/35 border-dashed"
                                        />
                                        <div className="absolute inset-[42px] rounded-2xl bg-surface flex items-center justify-center shadow-level-2 border border-border-base">
                                            <img src="/edusync-logo.svg" alt="EduSync logo" className="w-14 h-14" />
                                        </div>
                                    </div>
                                </div>

                                <p className="text-xs uppercase tracking-[0.18em] text-text-muted font-semibold text-center">
                                    People • Product • Platform
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </section>

                <section className="space-y-6">
                    {founders.map((founder, i) => {
                        const Icon = founder.Icon;
                        return (
                            <motion.article
                                key={founder.name}
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.08, duration: 0.45 }}
                                className="relative rounded-[30px] border border-border-base bg-surface/90 backdrop-blur-sm overflow-hidden shadow-level-2"
                            >
                                <div className={`absolute inset-0 bg-gradient-to-r ${founder.tone}`}></div>
                                <div className="absolute -right-16 -bottom-20 w-64 h-64 rounded-full border border-border-base/40"></div>

                                <div className="relative p-6 sm:p-8 lg:p-10 grid gap-6 lg:gap-8 lg:grid-cols-[110px_1fr_auto] items-start">
                                    <div>
                                        <p className="text-3xl sm:text-4xl font-heading font-bold text-primary leading-none">{founder.id}</p>
                                        <p className="text-[11px] tracking-[0.18em] uppercase text-text-muted font-semibold mt-3">Co-Founder</p>
                                    </div>

                                    <div>
                                        <div className="flex flex-wrap items-center gap-3 mb-3">
                                            <h2 className="text-2xl sm:text-3xl font-heading font-bold">{founder.name}</h2>
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-surface border border-border-base text-text-secondary uppercase tracking-wider">
                                                <Icon className="w-3.5 h-3.5 text-primary" />
                                                {founder.role}
                                            </span>
                                        </div>

                                        <p className="text-text-secondary leading-relaxed text-[15px] sm:text-base max-w-3xl">
                                            {founder.description}
                                        </p>

                                        <div className="flex flex-wrap gap-2 mt-5">
                                            {founder.specialties.map((item) => (
                                                <span
                                                    key={item}
                                                    className="px-3 py-1.5 rounded-lg bg-surface border border-border-base text-xs font-semibold text-text-secondary"
                                                >
                                                    {item}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex lg:flex-col gap-3">
                                        <a
                                            href={founder.github}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface border border-border-base text-sm font-semibold hover:border-primary/40 hover:text-primary hover:shadow-level-1 transition-all"
                                        >
                                            <Github className="w-4 h-4" />
                                            GitHub
                                        </a>
                                        <a
                                            href={founder.linkedin}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface border border-border-base text-sm font-semibold hover:border-secondary-base/40 hover:text-secondary-base hover:shadow-level-1 transition-all"
                                        >
                                            <Linkedin className="w-4 h-4" />
                                            LinkedIn
                                        </a>
                                    </div>
                                </div>
                            </motion.article>
                        );
                    })}
                </section>

                <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="mt-12 rounded-2xl border border-border-base bg-surface/90 backdrop-blur-sm p-6 text-center shadow-level-1"
                >
                    <p className="text-text-secondary text-sm sm:text-base">
                        “We are not just shipping features. We are shaping learning momentum.”
                    </p>
                    <div className="inline-flex items-center gap-2 mt-3 text-xs uppercase tracking-[0.18em] font-bold text-primary">
                        EduSync Founders
                        <ArrowUpRight className="w-3.5 h-3.5" />
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Founders;
