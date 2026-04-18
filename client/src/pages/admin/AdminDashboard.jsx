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

            if (uPassword && uPassword.trim() !== '') {
                if (editUserId) {
                    const confirmed = window.confirm("Are you sure you want to reset this user's password?");
                    if (!confirmed) return;
                }
                reqBody.password = uPassword.trim();
            }

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
            <div className="flex flex-col md:flex-row gap-8 min-h-[calc(100vh-4rem)]">
                {/* Left Rail Navigation */}
                <div className="w-full md:w-64 shrink-0 flex flex-col gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-warning/10 rounded-xl">
                                <ShieldCheck className="w-6 h-6 text-warning" />
                            </div>
                            <h1 className="text-2xl font-heading font-bold text-text-primary tracking-tight">Admin</h1>
                        </div>
                        <p className="text-sm text-text-secondary leading-relaxed pl-1">
                            System hierarchy and identity management.
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 mt-4">
                        <button
                            onClick={() => setActiveTab('HIERARCHY')}
                            className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all font-medium text-sm ${activeTab === 'HIERARCHY' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:bg-surface-alt hover:text-text-primary'}`}
                        >
                            <Layers className="w-4 h-4" /> Academic Hierarchy
                        </button>
                        <button
                            onClick={() => setActiveTab('USERS')}
                            className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all font-medium text-sm ${activeTab === 'USERS' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:bg-surface-alt hover:text-text-primary'}`}
                        >
                            <Users className="w-4 h-4" /> User Directory
                        </button>
                    </div>
                    
                    <div className="mt-auto pt-8 border-t border-border-base">
                        <button onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); }} className="flex items-center gap-3 w-full p-3 rounded-xl text-danger hover:bg-danger/10 transition-colors text-sm font-medium">
                            <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 min-w-0 bg-surface border border-border-base rounded-2xl p-6 shadow-sm">
                    {activeTab === 'HIERARCHY' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="h-full flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-xl font-heading font-bold text-text-primary">Branch Nodes</h2>
                                    <p className="text-sm text-text-secondary mt-1">Configure academic structures for content routing.</p>
                                </div>
                                <Button variant="primary" onClick={() => openStructureModal()} className="flex items-center gap-2">
                                    <Plus className="w-4 h-4" /> New Node
                                </Button>
                            </div>

                            <div className="flex-1 overflow-auto rounded-xl border border-border-base bg-surface-base">
                                <table className="w-full text-left whitespace-nowrap text-sm">
                                    <thead className="bg-surface-alt border-b border-border-base sticky top-0 z-10">
                                        <tr>
                                            <th className="px-6 py-4 font-medium text-text-secondary uppercase text-xs tracking-wider">Year</th>
                                            <th className="px-6 py-4 font-medium text-text-secondary uppercase text-xs tracking-wider">Branch</th>
                                            <th className="px-6 py-4 font-medium text-text-secondary uppercase text-xs tracking-wider">Section</th>
                                            <th className="px-6 py-4 font-medium text-text-secondary uppercase text-xs tracking-wider">Enrolled</th>
                                            <th className="px-6 py-4 font-medium text-text-secondary uppercase text-xs tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-subtle bg-surface">
                                        {structures.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-12 text-center">
                                                    <Layers className="w-8 h-8 text-text-muted/30 mx-auto mb-3" />
                                                    <p className="text-text-secondary font-medium">No branch nodes defined.</p>
                                                </td>
                                            </tr>
                                        ) : structures.map((row) => (
                                            <tr key={row._id} className="hover:bg-surface-alt/30 transition-colors">
                                                <td className="px-6 py-4 text-text-primary">Year {row.year}</td>
                                                <td className="px-6 py-4 text-text-primary font-medium">{row.branch}</td>
                                                <td className="px-6 py-4 text-text-secondary">Sec {row.section}</td>
                                                <td className="px-6 py-4">
                                                    <Badge color="primary" className="font-mono">{row.students?.length || 0}</Badge>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick={() => setViewStudentsModal({ isOpen: true, structure: row })} className="text-text-secondary hover:text-primary p-2 rounded-lg hover:bg-primary/10 transition-colors" title="View Students"><Users className="w-4 h-4" /></button>
                                                        <button onClick={() => openStructureModal(row)} className="text-text-secondary hover:text-primary p-2 rounded-lg hover:bg-primary/10 transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                                                        <button onClick={() => handleDeleteStructure(row._id)} className="text-text-secondary hover:text-danger p-2 rounded-lg hover:bg-danger/10 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'USERS' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="h-full flex flex-col">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                <div>
                                    <h2 className="text-xl font-heading font-bold text-text-primary">Identity Directory</h2>
                                    <p className="text-sm text-text-secondary mt-1">Manage system access and roles.</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex bg-surface-alt border border-border-base rounded-lg p-1">
                                        {['STUDENT', 'TEACHER'].map((r) => (
                                            <button
                                                key={r}
                                                onClick={() => setUserRoleFilter(r)}
                                                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${userRoleFilter === r ? 'bg-surface border border-border-subtle text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                                            >
                                                {r === 'TEACHER' ? 'Faculty' : 'Students'}
                                            </button>
                                        ))}
                                    </div>
                                    <Button variant="primary" onClick={() => openUserModal()} className="flex items-center gap-2">
                                        <Plus className="w-4 h-4" /> New User
                                    </Button>
                                    {userRoleFilter === 'STUDENT' && (
                                        <Button variant="secondary" onClick={openBulkImportModal} className="flex items-center gap-2">
                                            <Upload className="w-4 h-4" /> Import CSV
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-auto rounded-xl border border-border-base bg-surface-base">
                                <table className="w-full text-left whitespace-nowrap text-sm">
                                    <thead className="bg-surface-alt border-b border-border-base sticky top-0 z-10">
                                        <tr>
                                            <th className="px-6 py-4 font-medium text-text-secondary uppercase text-xs tracking-wider">Identity</th>
                                            <th className="px-6 py-4 font-medium text-text-secondary uppercase text-xs tracking-wider">Role</th>
                                            {userRoleFilter === 'STUDENT' && <th className="px-6 py-4 font-medium text-text-secondary uppercase text-xs tracking-wider">Context</th>}
                                            <th className="px-6 py-4 font-medium text-text-secondary uppercase text-xs tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-subtle bg-surface">
                                        {users.length === 0 ? (
                                            <tr>
                                                <td colSpan={userRoleFilter === 'STUDENT' ? "4" : "3"} className="px-6 py-12 text-center">
                                                    <Users className="w-8 h-8 text-text-muted/30 mx-auto mb-3" />
                                                    <p className="text-text-secondary font-medium">No identities found in this category.</p>
                                                </td>
                                            </tr>
                                        ) : users.map((user) => (
                                            <tr key={user._id} className="hover:bg-surface-alt/30 transition-colors">
                                                <td className="px-6 py-3">
                                                    <p className="font-medium text-text-primary">{user.name}</p>
                                                    <p className="text-xs text-text-secondary font-mono mt-0.5">{user.email}</p>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <Badge color={user.role === 'ADMIN' ? 'danger' : user.role === 'TEACHER' ? 'primary' : 'success'}>
                                                        {user.role === 'TEACHER' ? 'FACULTY' : user.role}
                                                    </Badge>
                                                </td>
                                                {userRoleFilter === 'STUDENT' && (
                                                    <td className="px-6 py-3">
                                                        {user.academicContext ? (
                                                            <span className="text-sm text-text-secondary">Y{user.academicContext.year} • {user.academicContext.branch} • {user.academicContext.section}</span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-warning/10 text-warning text-xs font-medium border border-warning/20">Unassigned</span>
                                                        )}
                                                    </td>
                                                )}
                                                <td className="px-6 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick={() => openUserModal(user)} className="text-text-secondary hover:text-primary p-2 rounded-lg hover:bg-primary/10 transition-colors"><Edit2 className="w-4 h-4" /></button>
                                                        <button onClick={() => handleDeleteUser(user._id)} className="text-text-secondary hover:text-danger p-2 rounded-lg hover:bg-danger/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Structure Modal */}
            <AnimatePresence>
                {isStructureModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background-base/80 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md">
                            <Card className="p-6 shadow-xl border border-border-base">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-heading font-bold text-text-primary flex items-center gap-2">
                                        <Layers className="w-5 h-5 text-primary" />
                                        {editStructureId ? 'Edit' : 'Create'} Branch Node
                                    </h3>
                                    <button onClick={closeStructureModal} className="text-text-muted hover:text-text-primary transition-colors"><X className="w-5 h-5" /></button>
                                </div>
                                <form onSubmit={handleSaveStructure} className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-text-secondary mb-1.5">Academic Year</label>
                                            <input type="text" placeholder="e.g. 2" required value={year} onChange={e => setYear(e.target.value)} className="w-full bg-surface border border-border-base rounded-lg px-4 py-2.5 text-text-primary focus:ring-1 focus:ring-primary focus:border-primary transition-all" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-text-secondary mb-1.5">Section Name</label>
                                            <input type="text" placeholder="e.g. A" required value={section} onChange={e => setSection(e.target.value)} className="w-full bg-surface border border-border-base rounded-lg px-4 py-2.5 text-text-primary focus:ring-1 focus:ring-primary focus:border-primary transition-all" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1.5">Department / Branch</label>
                                        <input type="text" placeholder="e.g. Computer Science" required value={branch} onChange={e => setBranch(e.target.value)} className="w-full bg-surface border border-border-base rounded-lg px-4 py-2.5 text-text-primary focus:ring-1 focus:ring-primary focus:border-primary transition-all" />
                                    </div>
                                    <div className="pt-2">
                                        <Button type="submit" variant="primary" className="w-full py-2.5">{editStructureId ? 'Update Node' : 'Initialize Node'}</Button>
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
                            <Card className="p-6 shadow-xl border border-border-base">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-heading font-bold text-text-primary flex items-center gap-2">
                                        <Users className="w-5 h-5 text-primary" />
                                        {editUserId ? 'Modify' : 'Provision'} Identity
                                    </h3>
                                    <button onClick={() => setIsUserModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors"><X className="w-5 h-5" /></button>
                                </div>
                                <form onSubmit={handleSaveUser} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1.5">Full Name</label>
                                        <input type="text" required value={uName} onChange={e => setUName(e.target.value)} className="w-full bg-surface border border-border-base rounded-lg px-4 py-2.5 text-text-primary focus:ring-1 focus:ring-primary transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1.5">Email Address</label>
                                        <input type="email" required value={uEmail} onChange={e => setUEmail(e.target.value)} className="w-full bg-surface border border-border-base rounded-lg px-4 py-2.5 text-text-primary focus:ring-1 focus:ring-primary transition-all font-mono text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1.5">Security Credential</label>
                                        <input type="password" required={!editUserId} value={uPassword} onChange={e => setUPassword(e.target.value)} placeholder={editUserId ? "Leave blank to preserve" : "min. 6 characters"} className="w-full bg-surface border border-border-base rounded-lg px-4 py-2.5 text-text-primary focus:ring-1 focus:ring-primary transition-all" />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-text-secondary mb-1.5">Authorization Role</label>
                                            {editUserId && uRole === 'STUDENT' ? (
                                                <div className="w-full bg-surface-alt border border-border-base rounded-lg px-4 py-2.5 text-text-secondary text-sm flex items-center">
                                                    Student <span className="ml-auto text-xs text-warning">Locked</span>
                                                </div>
                                            ) : (
                                                <div className="relative">
                                                    <select value={uRole} onChange={e => setURole(e.target.value)} className="w-full bg-surface border border-border-base rounded-lg pl-4 pr-8 py-2.5 text-text-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer">
                                                        <option value="STUDENT">Student</option>
                                                        <option value="TEACHER">Faculty</option>
                                                    </select>
                                                    <ChevronDown className="w-4 h-4 text-text-muted absolute right-3 top-3 pointer-events-none" />
                                                </div>
                                            )}
                                        </div>
                                        
                                        {uRole === 'STUDENT' && (
                                            <div>
                                                <label className="block text-sm font-medium text-text-secondary mb-1.5">Academic Context</label>
                                                {editUserId && uContextId ? (
                                                    <div className="w-full bg-surface-alt border border-border-base rounded-lg px-4 py-2.5 text-text-secondary text-sm flex items-center">
                                                        Mapped <span className="ml-auto text-xs text-warning">Locked</span>
                                                    </div>
                                                ) : (
                                                    <div className="relative">
                                                        <select value={uContextId} onChange={e => setUContextId(e.target.value)} className="w-full bg-surface border border-border-base rounded-lg pl-4 pr-8 py-2.5 text-text-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer text-sm">
                                                            <option value="">Unassigned</option>
                                                            {structures.map(s => <option key={s._id} value={s._id}>Y{s.year} • Sec {s.section}</option>)}
                                                        </select>
                                                        <ChevronDown className="w-4 h-4 text-text-muted absolute right-3 top-3 pointer-events-none" />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="pt-4 mt-2 border-t border-border-subtle">
                                        <Button type="submit" variant="primary" className="w-full py-2.5">{editUserId ? 'Commit Changes' : 'Provision Identity'}</Button>
                                    </div>
                                </form>
                            </Card>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Modal - Kept minimal and robust */}
            <AnimatePresence>
                {deleteModal.isOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background-base/80 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-sm">
                            <Card className="p-6 text-center border border-danger/20 shadow-xl">
                                <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4 border border-danger/20">
                                    <AlertTriangle className="w-6 h-6 text-danger" />
                                </div>
                                <h3 className="text-xl font-heading font-bold text-text-primary mb-2">{deleteModal.title}</h3>
                                <p className="text-text-secondary text-sm mb-6 leading-relaxed">{deleteModal.text}</p>
                                <div className="flex gap-3">
                                    <Button variant="secondary" onClick={() => setDeleteModal({ ...deleteModal, isOpen: false })} className="flex-1 justify-center">Abort</Button>
                                    <Button variant="danger" onClick={executeDelete} className="flex-1 justify-center shadow-md">Confirm Deletion</Button>
                                </div>
                            </Card>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modals Retained Below: View Students, Bulk Import */}
            <AnimatePresence>
                {viewStudentsModal.isOpen && viewStudentsModal.structure && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background-base/80 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" onClick={() => setViewStudentsModal({ isOpen: false, structure: null })} />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-2xl">
                            <Card className="p-6 max-h-[80vh] flex flex-col shadow-xl border border-border-base">
                                <div className="flex justify-between items-center mb-6 border-b border-border-subtle pb-4">
                                    <div>
                                        <h3 className="text-xl font-heading font-bold text-text-primary flex items-center gap-2">
                                            <Users className="w-5 h-5 text-primary" /> Directory Roster
                                        </h3>
                                        <p className="text-sm text-text-secondary mt-1">Year {viewStudentsModal.structure.year} • {viewStudentsModal.structure.branch} • Sec {viewStudentsModal.structure.section}</p>
                                    </div>
                                    <button onClick={() => setViewStudentsModal({ isOpen: false, structure: null })} className="text-text-muted hover:text-text-primary transition-colors"><X className="w-5 h-5" /></button>
                                </div>
                                <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-0">
                                    {viewStudentsModal.structure.students && viewStudentsModal.structure.students.length > 0 ? (
                                        <div className="space-y-2">
                                            {viewStudentsModal.structure.students.map(student => (
                                                <div key={student._id} className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border-base hover:border-primary/30 transition-colors">
                                                    <div>
                                                        <p className="font-medium text-text-primary text-sm">{student.name}</p>
                                                        <p className="text-xs text-text-secondary font-mono mt-0.5">{student.email}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge color="secondary" className="font-mono text-[10px] tracking-wider bg-surface-alt border border-border-base">{student.rollNumber || 'PENDING'}</Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-12 text-center">
                                            <p className="text-sm font-medium text-text-muted">No enrollments in this node.</p>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isBulkImportModalOpen && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-background-base/80 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-lg">
                            <Card className="p-6 shadow-xl border border-border-base">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold font-heading text-text-primary flex items-center gap-2">
                                        <FileSpreadsheet className="w-5 h-5 text-primary" /> Batch Provisioning
                                    </h3>
                                    <button onClick={() => setIsBulkImportModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors"><X className="w-5 h-5" /></button>
                                </div>
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1.5">Source Dataset (.xlsx)</label>
                                        <input type="file" accept=".xlsx,.xls" onChange={handleBulkFileChange} className="w-full bg-surface border border-border-base rounded-lg px-4 py-2 text-text-primary text-sm file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer transition-colors" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1.5">Target Destination Node</label>
                                        <div className="relative">
                                            <select value={bulkSectionId} onChange={e => setBulkSectionId(e.target.value)} className="w-full bg-surface border border-border-base rounded-lg px-4 py-2.5 text-text-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer text-sm">
                                                <option value="">Select routing node</option>
                                                {structures.map(s => <option key={s._id} value={s._id}>Year {s.year} • {s.branch} • Sec {s.section}</option>)}
                                            </select>
                                            <ChevronDown className="w-4 h-4 text-text-muted absolute right-4 top-3 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                        <Button variant="primary" onClick={handleBulkImport} disabled={!bulkFile || !bulkSectionId || bulkImporting} className="w-full py-2.5 flex items-center justify-center gap-2">
                                            <Upload className="w-4 h-4" /> {bulkImporting ? 'Processing Data...' : 'Execute Import'}
                                        </Button>
                                    </div>
                                    {bulkResult && (
                                        <div className={`mt-4 p-4 rounded-lg border ${bulkResult.error ? 'bg-danger/10 border-danger/20' : 'bg-success/10 border-success/20'}`}>
                                            {bulkResult.error ? (
                                                <div className="flex items-start gap-2">
                                                    <AlertTriangle className="w-5 h-5 text-danger shrink-0" />
                                                    <p className="text-sm text-danger">{bulkResult.error}</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 text-success font-medium">
                                                        <CheckCircle className="w-5 h-5" /> Operation Succeeded
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                                        <div className="bg-surface rounded-md p-2 border border-border-base"><div className="font-bold text-text-primary">{bulkResult.totalRows}</div><div className="text-xs text-text-muted">Total</div></div>
                                                        <div className="bg-surface rounded-md p-2 border border-border-base"><div className="font-bold text-success">{bulkResult.insertedCount}</div><div className="text-xs text-text-muted">Inserted</div></div>
                                                        <div className="bg-surface rounded-md p-2 border border-border-base"><div className="font-bold text-warning">{bulkResult.duplicateCount}</div><div className="text-xs text-text-muted">Skipped</div></div>
                                                    </div>
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
