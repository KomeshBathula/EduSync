import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card';
import PageContainer from '../../components/common/PageContainer';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { ShieldCheck, LogOut, X, Plus, Trash2, Edit2, Users, Layers, Upload, FileSpreadsheet, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api/axios';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('HIERARCHY');

    // Hierarchy State
    const [structures, setStructures] = useState([]);
    const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
    const [editStructureId, setEditStructureId] = useState(null);
    const [year, setYear] = useState('');
    const [branch, setBranch] = useState('');
    const [section, setSection] = useState('');

    // Users State
    const [users, setUsers] = useState([]);
    const [userRoleFilter, setUserRoleFilter] = useState('STUDENT');
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editUserId, setEditUserId] = useState(null);
    const [uName, setUName] = useState('');
    const [uEmail, setUEmail] = useState('');
    const [uPassword, setUPassword] = useState('');
    const [uRole, setURole] = useState('STUDENT');
    const [uContextId, setUContextId] = useState('');

    // Delete Confirmation State
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: null, id: null, title: '', text: '' });

    // Section-wise Students State
    const [viewStudentsModal, setViewStudentsModal] = useState({ isOpen: false, structure: null });

    // Bulk Import State
    const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
    const [bulkFile, setBulkFile] = useState(null);
    const [bulkSectionId, setBulkSectionId] = useState('');
    const [bulkImporting, setBulkImporting] = useState(false);
    const [bulkResult, setBulkResult] = useState(null);

    useEffect(() => {
        if (activeTab === 'HIERARCHY') fetchStructures();
        if (activeTab === 'USERS') fetchUsers();
    }, [activeTab, userRoleFilter]);

    // ==========================================
    // Hierarchy Logic
    // ==========================================
    const fetchStructures = async () => {
        try {
            const res = await api.get('/api/admin/academic');
            if (Array.isArray(res.data)) setStructures(res.data);
        } catch (error) { console.error('Error fetching structures:', error); }
    };

    const handleSaveStructure = async (e) => {
        e.preventDefault();
        const url = editStructureId ? `/api/admin/academic/${editStructureId}` : '/api/admin/academic';
        const method = editStructureId ? 'PUT' : 'POST';

        try {
            const res = await api({
                url,
                method,
                data: { year, branch, section }
            });
            if (res.data) {
                fetchStructures();
                closeStructureModal();
            } else {
                alert('Failed to save structure');
            }
        } catch (error) { console.error('Submission error:', error); }
    };

    const handleDeleteStructure = (id) => {
        setDeleteModal({
            isOpen: true,
            type: 'STRUCTURE',
            id,
            title: 'Delete Branch Node?',
            text: 'This will irreversibly shred the node and instantly unassign all enrolled students to mitigate data corruption. Proceed?'
        });
    };

    const confirmDeleteStructure = async (id) => {
        setStructures(prev => prev.filter(s => s._id !== id));
        try {
            await api.delete(`/api/admin/academic/${id}`);
        } catch (error) {
            console.error(error);
            fetchStructures();
        }
    };

    const openStructureModal = (structure = null) => {
        if (structure) {
            setEditStructureId(structure._id);
            setYear(structure.year);
            setBranch(structure.branch);
            setSection(structure.section);
        } else {
            setEditStructureId(null);
            setYear('');
            setBranch('');
            setSection('');
        }
        setIsStructureModalOpen(true);
    };

    const closeStructureModal = () => setIsStructureModalOpen(false);

    // ==========================================
    // Users Logic
    // ==========================================
    const fetchUsers = async () => {
        try {
            const res = await api.get(`/api/admin/users?role=${userRoleFilter}`);
            if (Array.isArray(res.data)) setUsers(res.data);

            // Need structures for the user edit dropdown
            if (structures.length === 0) fetchStructures();
        } catch (error) { console.error('Error fetching users:', error); }
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        try {
            const reqBody = { name: uName, email: uEmail, role: uRole };
            if (uRole === 'STUDENT' && uContextId !== '') reqBody.academicContextId = uContextId;
            else if (uRole !== 'STUDENT') reqBody.academicContextId = null;

            if (!editUserId && uPassword) reqBody.password = uPassword;

            const url = editUserId ? `/api/admin/users/${editUserId}` : '/api/admin/users';
            const method = editUserId ? 'PUT' : 'POST';

            const res = await api({
                url,
                method,
                data: reqBody
            });

            if (res.data) {
                fetchUsers();
                fetchStructures(); // Update structure counts
                setIsUserModalOpen(false);
            } else {
                alert('Failed to save user');
            }
        } catch (error) { console.error(error) }
    };

    const handleDeleteUser = (id) => {
        setDeleteModal({
            isOpen: true,
            type: 'USER',
            id,
            title: 'Delete User Profile?',
            text: 'This action cannot be undone. System records mapped to this user will be entirely purged.'
        });
    };

    const confirmDeleteUser = async (id) => {
        setUsers(prev => prev.filter(u => u._id !== id));
        try {
            await api.delete(`/api/admin/users/${id}`);
            fetchStructures();
        } catch (error) {
            console.error(error);
            fetchUsers();
        }
    };

    const openUserModal = (user = null) => {
        if (user) {
            setEditUserId(user._id);
            setUName(user.name);
            setUEmail(user.email);
            setUPassword('');
            setURole(user.role);
            setUContextId(user.academicContext ? user.academicContext._id : '');
        } else {
            setEditUserId(null);
            setUName('');
            setUEmail('');
            setUPassword('');
            setURole(userRoleFilter !== 'ADMIN' ? userRoleFilter : 'STUDENT');
            setUContextId('');
        }
        setIsUserModalOpen(true);
    };

    const handleEditStudentFromModal = (student, structure) => {
        setViewStudentsModal({ isOpen: false, structure: null });
        openUserModal({
            ...student,
            role: 'STUDENT',
            academicContext: structure
        });
    };

    const handleDeleteStudentFromModal = (studentId) => {
        setViewStudentsModal({ isOpen: false, structure: null });
        handleDeleteUser(studentId);
    };

    // ==========================================
    // Delete Confirmation Logic
    // ==========================================
    const executeDelete = () => {
        if (deleteModal.type === 'STRUCTURE') confirmDeleteStructure(deleteModal.id);
        if (deleteModal.type === 'USER') confirmDeleteUser(deleteModal.id);
        setDeleteModal({ isOpen: false, type: null, id: null, title: '', text: '' });
    };

    // ==========================================
    // Bulk Import Logic
    // ==========================================
    const openBulkImportModal = () => {
        setBulkFile(null);
        setBulkSectionId('');
        setBulkResult(null);
        setBulkImporting(false);
        setIsBulkImportModalOpen(true);
    };

    const handleBulkFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const EXCEL_MIMETYPES = [
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel'
            ];
            if (!EXCEL_MIMETYPES.includes(file.type)) {
                alert('Only Excel files (.xlsx, .xls) are allowed');
                e.target.value = '';
                return;
            }
            setBulkFile(file);
        }
    };

    const handleBulkImport = async () => {
        if (!bulkFile || !bulkSectionId) return;
        setBulkImporting(true);
        setBulkResult(null);
        try {
            const formData = new FormData();
            formData.append('file', bulkFile);
            formData.append('sectionId', bulkSectionId);
            const res = await api.post('/api/admin/users/bulk-import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setBulkResult(res.data);
            fetchUsers();
            fetchStructures();
        } catch (error) {
            setBulkResult({ error: error.response?.data?.message || error.message });
        } finally {
            setBulkImporting(false);
        }
    };

    // ==========================================
    // Render Functions
    // ==========================================
    return (
        <PageContainer>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-heading font-bold tracking-tight text-text-primary mb-2 flex items-center gap-3">
                        <ShieldCheck className="w-8 h-8 text-warning" />
                        System Administration
                    </h1>
                    <p className="text-text-secondary">Manage academic hierarchy and holistic system data</p>
                </div>
                <Button variant="danger" onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); }} className="flex items-center gap-2 text-sm">
                    <LogOut className="w-4 h-4" />
                    Logout
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                <Card className="col-span-1 lg:col-span-1 p-4 shadow-level1 h-fit">
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => setActiveTab('HIERARCHY')}
                            className={`flex items-center gap-3 w-full p-3 rounded-[var(--radius-md)] transition-all ${activeTab === 'HIERARCHY' ? 'bg-primary-light/10 text-primary border border-primary/20' : 'text-text-secondary hover:bg-surface-alt hover:text-text-primary'}`}
                        >
                            <Layers className="w-5 h-5" />
                            <span className="font-semibold text-sm">Academic Hierarchy</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('USERS')}
                            className={`flex items-center gap-3 w-full p-3 rounded-[var(--radius-md)] transition-all ${activeTab === 'USERS' ? 'bg-primary-light/10 text-primary border border-primary/20' : 'text-text-secondary hover:bg-surface-alt hover:text-text-primary'}`}
                        >
                            <Users className="w-5 h-5" />
                            <span className="font-semibold text-sm">User Directory</span>
                        </button>
                    </div>
                </Card>

                <div className="col-span-1 lg:col-span-3">
                    {activeTab === 'HIERARCHY' && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                            <Card className="w-full p-0 overflow-hidden shadow-level1">
                                <div className="flex justify-between items-center p-6 border-b border-border-base bg-surface-base">
                                    <h3 className="text-xl font-heading font-bold text-text-primary">Hierarchy Configurations</h3>
                                    <Button variant="primary" onClick={() => openStructureModal()} className="flex items-center gap-2 text-sm">
                                        <Plus className="w-4 h-4" /> Add Branch Node
                                    </Button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left whitespace-nowrap text-sm">
                                        <thead className="bg-surface-alt border-b border-border-base">
                                            <tr>
                                                <th className="px-6 py-4 font-semibold text-text-secondary uppercase text-xs tracking-wider">Year</th>
                                                <th className="px-6 py-4 font-semibold text-text-secondary uppercase text-xs tracking-wider">Branch</th>
                                                <th className="px-6 py-4 font-semibold text-text-secondary uppercase text-xs tracking-wider">Section</th>
                                                <th className="px-6 py-4 font-semibold text-text-secondary uppercase text-xs tracking-wider">Student Count</th>
                                                <th className="px-6 py-4 font-semibold text-text-secondary uppercase text-xs tracking-wider text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border-subtle bg-surface">
                                            {structures.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="px-6 py-8 text-center text-text-secondary italic">
                                                        No academic structures found. Create a new branch node.
                                                    </td>
                                                </tr>
                                            ) : structures.map((row) => (
                                                <tr key={row._id} className="hover:bg-surface-alt/50 transition-colors group">
                                                    <td className="px-6 py-4 font-medium text-text-primary">Year {row.year}</td>
                                                    <td className="px-6 py-4 text-primary font-medium">{row.branch}</td>
                                                    <td className="px-6 py-4 text-text-secondary">Sec {row.section}</td>
                                                    <td className="px-6 py-4 font-mono text-text-muted">{row.students?.length || 0}</td>
                                                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                                        <button onClick={() => setViewStudentsModal({ isOpen: true, structure: row })} className="text-text-muted hover:text-primary hover:bg-primary-light/10 transition-colors p-1.5 rounded-md" title="View Enrolled Students">
                                                            <Users className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => openStructureModal(row)} className="text-text-muted hover:text-primary hover:bg-primary-light/10 transition-colors p-1.5 rounded-md" title="Edit Structure">
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => handleDeleteStructure(row._id)} className="text-text-muted hover:text-danger hover:bg-danger/10 transition-colors p-1.5 rounded-md" title="Delete Structure">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </motion.div>
                    )}

                    {activeTab === 'USERS' && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                            <Card className="w-full p-0 overflow-hidden shadow-level1">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 border-b border-border-base bg-surface-base">
                                    <h3 className="text-xl font-heading font-bold text-text-primary">System Users</h3>
                                    <div className="flex items-center gap-4 w-full sm:w-auto">
                                        <div className="flex gap-1 p-1 bg-surface-alt rounded-lg border border-border-base flex-1 sm:flex-none">
                                            {['STUDENT', 'TEACHER'].map((r) => (
                                                <button
                                                    key={r}
                                                    onClick={() => setUserRoleFilter(r)}
                                                    className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-semibold rounded-[var(--radius-sm)] transition-all ${userRoleFilter === r ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-white/50 dark:hover:bg-white/5'}`}
                                                >
                                                    {r === 'TEACHER' ? 'FACULTY' : r}
                                                </button>
                                            ))}
                                        </div>
                                        <Button variant="primary" onClick={() => openUserModal()} className="flex items-center gap-2 text-sm shrink-0">
                                            <Plus className="w-4 h-4" /> Add User
                                        </Button>
                                        {userRoleFilter === 'STUDENT' && (
                                            <Button variant="ghost" onClick={openBulkImportModal} className="flex items-center gap-2 text-sm shrink-0 border border-border-base">
                                                <Upload className="w-4 h-4" /> Bulk Import
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left whitespace-nowrap text-sm">
                                        <thead className="bg-surface-alt border-b border-border-base">
                                            <tr>
                                                <th className="px-6 py-4 font-semibold text-text-secondary uppercase text-xs tracking-wider">Name & Email</th>
                                                <th className="px-6 py-4 font-semibold text-text-secondary uppercase text-xs tracking-wider">Role</th>
                                                {userRoleFilter === 'STUDENT' && <th className="px-6 py-4 font-semibold text-text-secondary uppercase text-xs tracking-wider">Class Context</th>}
                                                <th className="px-6 py-4 font-semibold text-text-secondary uppercase text-xs tracking-wider text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border-subtle bg-surface">
                                            {users.length === 0 ? (
                                                <tr>
                                                    <td colSpan={userRoleFilter === 'STUDENT' ? "4" : "3"} className="px-6 py-8 text-center text-text-secondary italic">
                                                        No {userRoleFilter.toLowerCase()}s found.
                                                    </td>
                                                </tr>
                                            ) : users.map((user) => (
                                                <tr key={user._id} className="hover:bg-surface-alt/50 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-text-primary">{user.name}</div>
                                                        <div className="text-xs text-text-secondary mt-0.5">{user.email}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <Badge color={user.role === 'ADMIN' ? 'danger' : user.role === 'TEACHER' ? 'primary' : 'success'}>
                                                            {user.role === 'TEACHER' ? 'FACULTY' : user.role}
                                                        </Badge>
                                                    </td>
                                                    {userRoleFilter === 'STUDENT' && (
                                                        <td className="px-6 py-4 text-sm text-text-secondary">
                                                            {user.academicContext ? `Y${user.academicContext.year} • ${user.academicContext.branch} • Sec ${user.academicContext.section}` : <span className="text-warning italic text-xs">Unassigned</span>}
                                                        </td>
                                                    )}
                                                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2 h-full py-auto">
                                                        <button onClick={() => openUserModal(user)} className="text-text-muted hover:text-primary hover:bg-primary-light/10 transition-colors p-1.5 rounded-md mt-2">
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => handleDeleteUser(user._id)} className="text-text-muted hover:text-danger hover:bg-danger/10 transition-colors p-1.5 rounded-md mt-2">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Structure Modal */}
            <AnimatePresence>
                {isStructureModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background-base/80 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md">
                            <Card className="p-6 border-primary/30 shadow-level3">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold font-heading text-text-primary flex items-center gap-2">
                                        <Layers className="w-5 h-5 text-primary" />
                                        {editStructureId ? 'Edit' : 'Add'} Academic Node
                                    </h3>
                                    <button onClick={closeStructureModal} className="text-text-muted hover:text-text-primary transition-colors"><X className="w-5 h-5" /></button>
                                </div>
                                <form onSubmit={handleSaveStructure} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1.5">Year</label>
                                        <input type="text" placeholder="e.g. 2" required value={year} onChange={e => setYear(e.target.value)} className="w-full bg-surface-alt border border-border-base rounded-[var(--radius-md)] px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1.5">Branch Name</label>
                                        <input type="text" placeholder="e.g. Computer Science" required value={branch} onChange={e => setBranch(e.target.value)} className="w-full bg-surface-alt border border-border-base rounded-[var(--radius-md)] px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1.5">Section</label>
                                        <input type="text" placeholder="e.g. A" required value={section} onChange={e => setSection(e.target.value)} className="w-full bg-surface-alt border border-border-base rounded-[var(--radius-md)] px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                                    </div>
                                    <div className="pt-2">
                                        <Button type="submit" variant="primary" className="w-full justify-center">Save Configuration</Button>
                                    </div>
                                </form>
                            </Card>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* User Edit Modal */}
            <AnimatePresence>
                {isUserModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background-base/80 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md">
                            <Card className="p-6 border-primary/30 shadow-level3">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold font-heading text-text-primary flex items-center gap-2">
                                        <Users className="w-5 h-5 text-primary" />
                                        {editUserId ? 'Edit' : 'Create'} User Profile
                                    </h3>
                                    <button onClick={() => setIsUserModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors"><X className="w-5 h-5" /></button>
                                </div>
                                <form onSubmit={handleSaveUser} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1.5">Full Name</label>
                                        <input type="text" required value={uName} onChange={e => setUName(e.target.value)} className="w-full bg-surface-alt border border-border-base rounded-[var(--radius-md)] px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
                                        <input type="email" required value={uEmail} onChange={e => setUEmail(e.target.value)} className="w-full bg-surface-alt border border-border-base rounded-[var(--radius-md)] px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                                    </div>
                                    {!editUserId && (
                                        <div>
                                            <label className="block text-sm font-medium text-text-secondary mb-1.5">Set Initial Password</label>
                                            <input type="text" required value={uPassword} onChange={e => setUPassword(e.target.value)} placeholder="Minimum 6 characters" className="w-full bg-surface-alt border border-border-base rounded-[var(--radius-md)] px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1.5">Role</label>
                                        <div className="relative">
                                            {editUserId && uRole === 'STUDENT' ? (
                                                <div className="w-full bg-surface-alt border border-border-base rounded-[var(--radius-md)] px-4 py-2.5 text-text-muted cursor-not-allowed flex items-center gap-2">
                                                    Student (locked)
                                                    <span className="text-xs text-warning ml-auto">Permanent</span>
                                                </div>
                                            ) : (
                                                <select value={uRole} onChange={e => setURole(e.target.value)} className="w-full bg-surface-alt border border-border-base rounded-[var(--radius-md)] px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer">
                                                    <option value="STUDENT">Student</option>
                                                    <option value="TEACHER">Faculty</option>
                                                </select>
                                            )}
                                            {!(editUserId && uRole === 'STUDENT') && <div className="absolute right-4 top-3 pointer-events-none text-text-secondary">&#9660;</div>}
                                        </div>
                                    </div>

                                    {uRole === 'STUDENT' && (
                                        <div>
                                            <label className="block text-sm font-medium text-text-secondary mb-1.5">Academic Context</label>
                                            <div className="relative">
                                                {editUserId && uContextId ? (
                                                    <div className="w-full bg-surface-alt border border-border-base rounded-[var(--radius-md)] px-4 py-2.5 text-text-muted cursor-not-allowed flex items-center gap-2 text-sm">
                                                        {(() => {
                                                            const s = structures.find(s => s._id === uContextId);
                                                            return s ? `Year ${s.year} - ${s.branch} - Sec ${s.section} (locked)` : 'Assigned (locked)';
                                                        })()}
                                                        <span className="text-xs text-warning ml-auto">Permanent</span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <select value={uContextId} onChange={e => setUContextId(e.target.value)} className="w-full bg-surface-alt border border-border-base rounded-[var(--radius-md)] px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer text-sm">
                                                            <option value="">Unassigned</option>
                                                            {structures.map(s => (
                                                                <option key={s._id} value={s._id}>Year {s.year} - {s.branch} - Sec {s.section}</option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute right-4 top-3 pointer-events-none text-text-secondary text-xs">&#9660;</div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    <div className="pt-2">
                                        <Button type="submit" variant="primary" className="w-full justify-center">{editUserId ? 'Update Details' : 'Create User'}</Button>
                                    </div>
                                </form>
                            </Card>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteModal.isOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background-base/80 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-sm">
                            <Card className="p-6 text-center border-danger/20 shadow-level3">
                                <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4 border border-danger/20">
                                    <Trash2 className="w-8 h-8 text-danger" />
                                </div>
                                <h3 className="text-xl font-heading font-bold text-text-primary mb-2">{deleteModal.title}</h3>
                                <p className="text-text-secondary text-sm mb-6">{deleteModal.text}</p>
                                <div className="flex gap-3">
                                    <Button variant="ghost" onClick={() => setDeleteModal({ ...deleteModal, isOpen: false })} className="flex-1 justify-center bg-surface-alt hover:bg-border-subtle border border-border-base transition-colors">Cancel</Button>
                                    <Button variant="danger" onClick={executeDelete} className="flex-1 justify-center text-white shadow-lg transition-colors">Delete</Button>
                                </div>
                            </Card>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* View Section-wise Students Modal */}
            <AnimatePresence>
                {viewStudentsModal.isOpen && viewStudentsModal.structure && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background-base/80 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" onClick={() => setViewStudentsModal({ isOpen: false, structure: null })} />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-2xl">
                            <Card className="p-6 max-h-[80vh] flex flex-col shadow-level3 border-primary/20">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="text-xl font-heading font-bold text-text-primary flex items-center gap-2">
                                            <Users className="w-5 h-5 text-primary" />
                                            Enrolled Students
                                        </h3>
                                        <p className="text-sm text-text-secondary mt-1">
                                            Year {viewStudentsModal.structure.year} • {viewStudentsModal.structure.branch} • Sec {viewStudentsModal.structure.section}
                                        </p>
                                    </div>
                                    <button onClick={() => setViewStudentsModal({ isOpen: false, structure: null })} className="text-text-muted hover:text-text-primary transition-colors"><X className="w-5 h-5" /></button>
                                </div>

                                <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-0">
                                    {viewStudentsModal.structure.students && viewStudentsModal.structure.students.length > 0 ? (
                                        <div className="space-y-3">
                                            {viewStudentsModal.structure.students.map(student => (
                                                <div key={student._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-[var(--radius-md)] bg-surface-alt border border-border-base hover:border-primary/30 transition-colors gap-3">
                                                    <div>
                                                        <div className="font-semibold text-text-primary">{student.name}</div>
                                                        <div className="text-xs text-text-secondary mt-0.5">{student.email}</div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Badge color="primary" className="hidden sm:inline-flex font-mono text-[10px] tracking-wide">
                                                            ID: {student.rollNumber || 'PENDING'}
                                                        </Badge>
                                                        <button onClick={() => handleEditStudentFromModal(student, viewStudentsModal.structure)} className="text-text-muted hover:text-primary hover:bg-primary-light/10 transition-colors p-1.5 rounded-md cursor-pointer">
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => handleDeleteStudentFromModal(student._id)} className="text-text-muted hover:text-danger hover:bg-danger/10 transition-colors p-1.5 rounded-md cursor-pointer">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-12 text-center text-text-secondary border border-dashed border-border-base rounded-[var(--radius-md)] bg-surface-base">
                                            <Users className="w-10 h-10 mx-auto mb-3 opacity-30 text-text-muted" />
                                            <p className="text-sm font-medium text-text-muted">No students enrolled in this section yet.</p>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Bulk Import Modal */}
            <AnimatePresence>
                {isBulkImportModalOpen && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-background-base/80 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-lg">
                            <Card className="p-6 border-primary/30 shadow-level3">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold font-heading text-text-primary flex items-center gap-2">
                                        <FileSpreadsheet className="w-5 h-5 text-primary" />
                                        Bulk Import Students
                                    </h3>
                                    <button onClick={() => setIsBulkImportModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors"><X className="w-5 h-5" /></button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1.5">Excel File (.xlsx, .xls)</label>
                                        <input type="file" accept=".xlsx,.xls" onChange={handleBulkFileChange} className="w-full bg-surface-alt border border-border-base rounded-[var(--radius-md)] px-4 py-2.5 text-text-primary text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary-dark cursor-pointer" />
                                        <p className="text-xs text-text-muted mt-1">Required columns: "Name of the Student", "Roll Number", "Section"</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1.5">Target Section</label>
                                        <div className="relative">
                                            <select value={bulkSectionId} onChange={e => setBulkSectionId(e.target.value)} className="w-full bg-surface-alt border border-border-base rounded-[var(--radius-md)] px-4 py-2.5 text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer text-sm">
                                                <option value="">Select a section</option>
                                                {structures.map(s => (
                                                    <option key={s._id} value={s._id}>Year {s.year} - {s.branch} - Sec {s.section}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-3 pointer-events-none text-text-secondary text-xs">&#9660;</div>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <Button variant="primary" onClick={handleBulkImport} disabled={!bulkFile || !bulkSectionId || bulkImporting} className="w-full justify-center flex items-center gap-2">
                                            <Upload className="w-4 h-4" />
                                            {bulkImporting ? 'Importing...' : 'Upload & Import'}
                                        </Button>
                                    </div>

                                    {bulkResult && (
                                        <div className={`mt-4 p-4 rounded-[var(--radius-md)] border ${bulkResult.error ? 'bg-danger/5 border-danger/20' : 'bg-success/5 border-success/20'}`}>
                                            {bulkResult.error ? (
                                                <div className="flex items-start gap-2">
                                                    <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                                                    <p className="text-sm text-danger">{bulkResult.error}</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle className="w-5 h-5 text-success" />
                                                        <span className="text-sm font-medium text-text-primary">Import Complete</span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                                        <div className="p-2 bg-surface-alt rounded-md">
                                                            <div className="font-bold text-text-primary">{bulkResult.totalRows}</div>
                                                            <div className="text-xs text-text-muted">Total Rows</div>
                                                        </div>
                                                        <div className="p-2 bg-surface-alt rounded-md">
                                                            <div className="font-bold text-success">{bulkResult.insertedCount}</div>
                                                            <div className="text-xs text-text-muted">Inserted</div>
                                                        </div>
                                                        <div className="p-2 bg-surface-alt rounded-md">
                                                            <div className="font-bold text-warning">{bulkResult.duplicateCount}</div>
                                                            <div className="text-xs text-text-muted">Duplicates</div>
                                                        </div>
                                                    </div>
                                                    {bulkResult.errors && bulkResult.errors.length > 0 && (
                                                        <div className="mt-2 max-h-32 overflow-y-auto text-xs text-text-secondary space-y-1">
                                                            {bulkResult.errors.map((err, i) => (
                                                                <div key={i} className="flex items-start gap-1">
                                                                    <AlertTriangle className="w-3 h-3 text-warning shrink-0 mt-0.5" />
                                                                    {err}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </PageContainer>
    );
};

export default AdminDashboard;
