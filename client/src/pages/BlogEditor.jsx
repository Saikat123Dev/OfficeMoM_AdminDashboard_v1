import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import {
    ArrowLeft, Save, Globe, Image as ImageIcon, X,
    Upload, Tag, FileText, Eye, Loader2, Check, Clock3, Type, ScanText, Trash2
} from 'lucide-react';
import { blogService, uploadService } from '../services/api';

const QUILL_TOOLBAR = [
    [{ header: 1 }, { header: 2 }, { header: 3 }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ script: 'sub' }, { script: 'super' }],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }, { list: 'check' }],
    [{ indent: '-1' }, { indent: '+1' }, { align: [] }],
    [{ direction: 'rtl' }],
    ['blockquote', 'code-block'],
    ['link', 'image', 'video'],
    ['clean']
];

const BASE_QUILL_MODULES = {
    toolbar: QUILL_TOOLBAR,
    history: {
        delay: 500,
        maxStack: 100,
        userOnly: true
    },
    clipboard: { matchVisual: false }
};

const QUILL_FORMATS = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'script', 'color', 'background', 'list', 'indent', 'align', 'direction',
    'blockquote', 'code-block', 'link', 'image', 'video'
];

const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/pjpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml'
];
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

const stripHtml = (html = '') => {
    return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const toAbsoluteImageUrl = (rawUrl) => {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    const url = rawUrl.trim();
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('/')) return `${window.location.origin}${url}`;
    return `https://${url}`;
};

export default function BlogEditor() {
    const { id } = useParams();
    const isEditing = Boolean(id);
    const navigate = useNavigate();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [excerpt, setExcerpt] = useState('');
    const [metaDescription, setMetaDescription] = useState('');
    const [featuredImage, setFeaturedImage] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [availableTags, setAvailableTags] = useState([]);
    const [status, setStatus] = useState('draft');

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadingEditorImage, setUploadingEditorImage] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [error, setError] = useState('');

    const fileInputRef = useRef(null);
    const editorImageInputRef = useRef(null);
    const quillRef = useRef(null);

    useEffect(() => {
        if (isEditing) loadBlog();
        loadTags();
    }, [id]);

    useEffect(() => {
        const handleShortcutSave = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                if (!saving && !publishing) {
                    handleSave('draft');
                }
            }
        };
        window.addEventListener('keydown', handleShortcutSave);
        return () => window.removeEventListener('keydown', handleShortcutSave);
    }, [saving, publishing, title, content, excerpt, metaDescription, featuredImage, selectedTags, status, id]);

    const loadBlog = async () => {
        try {
            setLoading(true);
            const res = await blogService.getBlog(id);
            const blog = res.data.blog;
            setTitle(blog.title || '');
            setContent(blog.content || '');
            setExcerpt(blog.excerpt || '');
            setMetaDescription(blog.meta_description || '');
            setFeaturedImage(blog.featured_image || '');
            setSelectedTags(blog.tags || []);
            setStatus(blog.status || 'draft');
        } catch (err) {
            setError('Failed to load blog post');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadTags = async () => {
        try {
            const res = await blogService.getTags();
            setAvailableTags(res.data.tags || []);
        } catch (err) {
            console.error('Failed to load tags:', err);
        }
    };

    const showSaveMessage = (msg) => {
        setSaveMessage(msg);
        setTimeout(() => setSaveMessage(''), 3000);
    };

    const validateImageFile = (file) => {
        if (!file) return false;
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            setError('Invalid file type. Please upload JPG, PNG, WEBP, GIF, or SVG.');
            return false;
        }
        if (file.size > MAX_IMAGE_SIZE_BYTES) {
            setError('Image is too large. Maximum allowed size is 10MB.');
            return false;
        }
        return true;
    };

    const uploadFeaturedImage = async (file) => {
        if (!validateImageFile(file)) return;
        try {
            setUploadingImage(true);
            setError('');
            const res = await uploadService.uploadImage(file);
            const imageUrl = toAbsoluteImageUrl(res.data?.url);
            if (!imageUrl) throw new Error('Upload did not return a valid image URL');
            setFeaturedImage(imageUrl);
            showSaveMessage('✅ Featured image uploaded');
        } catch (err) {
            setError(err.response?.data?.error || 'Image upload failed — please check FTP settings');
            console.error(err);
        } finally {
            setUploadingImage(false);
        }
    };

    const uploadEditorImage = useCallback(async (file, insertIndex = null) => {
        if (!validateImageFile(file)) return;
        const quill = quillRef.current?.getEditor();
        if (!quill) return;

        try {
            setUploadingEditorImage(true);
            setError('');

            const res = await uploadService.uploadImage(file);
            const imageUrl = toAbsoluteImageUrl(res.data?.url);
            if (!imageUrl) throw new Error('Upload failed to return a URL');

            const index = typeof insertIndex === 'number'
                ? insertIndex
                : (quill.getSelection(true)?.index ?? quill.getLength());

            quill.insertEmbed(index, 'image', imageUrl, 'user');
            quill.setSelection(index + 1, 0);
            // Keep controlled state in sync with direct Quill mutations.
            setContent(quill.root.innerHTML);
            showSaveMessage('✅ Editor image uploaded to FTP');
        } catch (err) {
            setError(err.response?.data?.error || 'Editor image upload failed');
            console.error(err);
        } finally {
            setUploadingEditorImage(false);
        }
    }, []);

    const handleEditorToolbarImage = useCallback(() => {
        if (uploadingEditorImage) return;
        editorImageInputRef.current?.click();
    }, [uploadingEditorImage]);

    const quillModules = useMemo(() => ({
        ...BASE_QUILL_MODULES,
        toolbar: {
            container: QUILL_TOOLBAR,
            handlers: {
                image: handleEditorToolbarImage
            }
        }
    }), [handleEditorToolbarImage]);

    useEffect(() => {
        let canceled = false;
        let detachListeners = () => { };

        const bindListeners = () => {
            if (canceled) return;
            const quill = quillRef.current?.getEditor();
            if (!quill) {
                requestAnimationFrame(bindListeners);
                return;
            }

            const onPaste = async (event) => {
                const items = Array.from(event.clipboardData?.items || []);
                const imageItems = items.filter((item) => item.type?.startsWith('image/'));
                if (imageItems.length === 0) return;

                event.preventDefault();
                let index = quill.getSelection(true)?.index ?? quill.getLength();

                for (const item of imageItems) {
                    const file = item.getAsFile();
                    if (!file) continue;
                    await uploadEditorImage(file, index);
                    index += 1;
                }
            };

            const onDrop = async (event) => {
                const files = Array.from(event.dataTransfer?.files || []);
                const imageFiles = files.filter((file) => file.type?.startsWith('image/'));
                if (imageFiles.length === 0) return;

                event.preventDefault();
                let index = quill.getSelection(true)?.index ?? quill.getLength();
                for (const file of imageFiles) {
                    await uploadEditorImage(file, index);
                    index += 1;
                }
            };

            quill.root.addEventListener('paste', onPaste);
            quill.root.addEventListener('drop', onDrop);
            detachListeners = () => {
                quill.root.removeEventListener('paste', onPaste);
                quill.root.removeEventListener('drop', onDrop);
            };
        };

        bindListeners();

        return () => {
            canceled = true;
            detachListeners();
        };
    }, [uploadEditorImage]);

    const replaceEmbeddedImagesWithUploads = async (htmlContent) => {
        if (!htmlContent || !htmlContent.includes('data:image/')) {
            return htmlContent;
        }

        const dataUrlMatches = Array.from(
            htmlContent.matchAll(/src=(["'])(data:image\/[^"']+)\1/gi)
        ).map((match) => match[2]);
        const uniqueDataUrls = [...new Set(dataUrlMatches)];

        if (uniqueDataUrls.length === 0) return htmlContent;

        let updatedContent = htmlContent;
        try {
            setUploadingEditorImage(true);
            setError('');

            for (let i = 0; i < uniqueDataUrls.length; i += 1) {
                const dataUrl = uniqueDataUrls[i];
                const blobResponse = await fetch(dataUrl);
                const blob = await blobResponse.blob();
                const extension = (blob.type?.split('/')[1] || 'png').split('+')[0];
                const file = new File([blob], `inline-${Date.now()}-${i}.${extension}`, {
                    type: blob.type || 'image/png'
                });

                if (!validateImageFile(file)) {
                    throw new Error('Invalid embedded image file');
                }

                const uploadRes = await uploadService.uploadImage(file);
                const uploadedUrl = uploadRes.data?.url;
                if (!uploadedUrl) {
                    throw new Error('Embedded image upload did not return a URL');
                }

                updatedContent = updatedContent.split(dataUrl).join(uploadedUrl);
            }
        } finally {
            setUploadingEditorImage(false);
        }

        showSaveMessage('✅ Embedded images uploaded to FTP');
        return updatedContent;
    };

    const handleEditorImageInputChange = async (e) => {
        const file = e.target.files?.[0];
        const quill = quillRef.current?.getEditor();
        const index = quill?.getSelection(true)?.index ?? quill?.getLength() ?? 0;
        if (file) {
            await uploadEditorImage(file, index);
        }
        e.target.value = '';
    };

    const findSelectedImageIndex = (quill) => {
        const selection = quill.getSelection(true);
        if (!selection) return -1;

        const candidateIndexes = [selection.index, Math.max(0, selection.index - 1)];
        for (const idx of candidateIndexes) {
            const [leaf] = quill.getLeaf(idx);
            if (!leaf) continue;
            const blotName = leaf.statics?.blotName;
            const tagName = leaf.domNode?.tagName?.toLowerCase();
            if (blotName === 'image' || tagName === 'img') {
                return idx;
            }
        }
        return -1;
    };

    const handleRemoveSelectedEditorImage = () => {
        const quill = quillRef.current?.getEditor();
        if (!quill) return;

        const imageIndex = findSelectedImageIndex(quill);
        if (imageIndex < 0) {
            setError('Select an image in the editor first, then click Remove image.');
            return;
        }

        quill.deleteText(imageIndex, 1, 'user');
        setContent(quill.root.innerHTML);
        showSaveMessage('✅ Selected image removed');
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await uploadFeaturedImage(file);
        e.target.value = '';
    };

    const handleDropImage = async (e) => {
        e.preventDefault();
        setDragActive(false);
        if (uploadingImage) return;
        const file = e.dataTransfer?.files?.[0];
        if (!file) return;
        await uploadFeaturedImage(file);
    };

    const handleDragOverImage = (e) => {
        e.preventDefault();
        if (!uploadingImage) setDragActive(true);
    };

    const handleDragLeaveImage = (e) => {
        e.preventDefault();
        setDragActive(false);
    };

    const handleSave = async (publishStatus = null) => {
        if (!title.trim()) { setError('Title is required'); return; }
        if (!content.trim() || content === '<p><br></p>') { setError('Content is required'); return; }

        const finalStatus = publishStatus || status;
        const isPublishing = finalStatus === 'published';

        try {
            if (isPublishing) setPublishing(true);
            else setSaving(true);
            setError('');

            let finalContent = content;
            if (finalContent.includes('data:image/')) {
                finalContent = await replaceEmbeddedImagesWithUploads(finalContent);
                setContent(finalContent);
            }

            const payload = {
                title: title.trim(),
                content: finalContent,
                excerpt: excerpt.trim(),
                featured_image: featuredImage,
                status: finalStatus,
                meta_description: metaDescription.trim(),
                tags: selectedTags
            };

            let res;
            if (isEditing) {
                res = await blogService.updateBlog(id, payload);
            } else {
                res = await blogService.createBlog(payload);
            }

            setStatus(finalStatus);
            showSaveMessage(isPublishing ? '✅ Published!' : '✅ Saved!');

            if (!isEditing && res.data.blog?.id) {
                navigate(`/blogs/edit/${res.data.blog.id}`, { replace: true });
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save');
            console.error(err);
        } finally {
            setSaving(false);
            setPublishing(false);
        }
    };

    const handleAddTag = (tagName) => {
        const trimmed = tagName.trim();
        if (trimmed && !selectedTags.includes(trimmed)) {
            setSelectedTags([...selectedTags, trimmed]);
        }
        setTagInput('');
    };

    const handleTagKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            handleAddTag(tagInput);
        }
    };

    const removeTag = (tag) => setSelectedTags(selectedTags.filter(t => t !== tag));

    const filteredSuggestions = tagInput.trim()
        ? availableTags.filter(t =>
            t.name.toLowerCase().includes(tagInput.toLowerCase()) &&
            !selectedTags.includes(t.name)
        )
        : [];

    const plainTextContent = useMemo(() => stripHtml(content), [content]);
    const wordCount = useMemo(() => (plainTextContent ? plainTextContent.split(' ').length : 0), [plainTextContent]);
    const charCount = useMemo(() => plainTextContent.length, [plainTextContent]);
    const estimatedReadMinutes = useMemo(() => {
        if (!wordCount) return 0;
        return Math.max(1, Math.ceil(wordCount / 200));
    }, [wordCount]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Top Bar */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/blogs')}
                    className="flex items-center text-slate-400 hover:text-white transition-colors text-sm"
                >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to Posts
                </button>

                <div className="flex items-center gap-3">
                    {saveMessage && (
                        <span className="text-emerald-400 text-sm font-medium flex items-center animate-fade-in">
                            <Check className="h-4 w-4 mr-1" />
                            {saveMessage}
                        </span>
                    )}

                    {isEditing && (
                        <button
                            onClick={() => navigate(`/blogs/preview/${id}`)}
                            className="flex items-center px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700/50 text-sm transition-colors"
                        >
                            <Eye className="h-4 w-4 mr-1.5" /> Preview
                        </button>
                    )}

                    <button
                        onClick={() => handleSave('draft')}
                        disabled={saving}
                        className="flex items-center px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700/50 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                        Save Draft
                    </button>

                    <button
                        onClick={() => handleSave('published')}
                        disabled={publishing}
                        className="btn-gradient flex items-center text-sm disabled:opacity-50"
                    >
                        {publishing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Globe className="h-4 w-4 mr-1.5" />}
                        Publish
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between animate-fade-in">
                    <span className="text-red-300 text-sm">{error}</span>
                    <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Editor — 2 cols */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="card-dark p-6">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter your blog title..."
                            className="w-full text-2xl font-bold text-white bg-transparent border-none outline-none placeholder-slate-500"
                        />
                    </div>

                    <div className="card-dark overflow-hidden blog-editor">
                        <ReactQuill
                            ref={quillRef}
                            value={content}
                            onChange={setContent}
                            modules={quillModules}
                            formats={QUILL_FORMATS}
                            placeholder="Start writing your blog post..."
                            theme="snow"
                        />
                        <input
                            ref={editorImageInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleEditorImageInputChange}
                            className="hidden"
                        />
                    </div>

                    <div className="card-dark p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/50 border border-slate-700/50 text-slate-300">
                                    <Type className="h-3.5 w-3.5 text-indigo-400" />
                                    {wordCount} words
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/50 border border-slate-700/50 text-slate-300">
                                    <ScanText className="h-3.5 w-3.5 text-violet-400" />
                                    {charCount} chars
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/50 border border-slate-700/50 text-slate-300">
                                    <Clock3 className="h-3.5 w-3.5 text-emerald-400" />
                                    {estimatedReadMinutes} min read
                                </span>
                                {uploadingEditorImage && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Uploading editor image...
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={handleRemoveSelectedEditorImage}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-colors"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Remove image
                                </button>
                            </div>
                            <span className="text-[11px] text-slate-500">
                                `Ctrl/Cmd + S` to save draft
                            </span>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <div className="card-dark p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-400">Status</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${status === 'published'
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                                }`}>
                                {status === 'published' ? 'Published' : 'Draft'}
                            </span>
                        </div>
                    </div>

                    <div className="card-dark p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-white flex items-center">
                            <ImageIcon className="h-4 w-4 mr-2 text-indigo-400" />
                            Featured Image
                        </h3>

                        {featuredImage && (
                            <div className="relative rounded-lg overflow-hidden">
                                <img src={featuredImage} alt="Featured" className="w-full h-40 object-cover rounded-lg" />
                                <button
                                    onClick={() => setFeaturedImage('')}
                                    className="absolute top-2 right-2 p-1.5 bg-red-600/90 rounded-full hover:bg-red-700 transition-colors"
                                >
                                    <X className="h-3 w-3 text-white" />
                                </button>
                            </div>
                        )}

                        <div
                            onClick={() => !uploadingImage && fileInputRef.current?.click()}
                            onDrop={handleDropImage}
                            onDragOver={handleDragOverImage}
                            onDragLeave={handleDragLeaveImage}
                            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                                dragActive
                                    ? 'border-indigo-500 bg-indigo-500/10'
                                    : 'border-slate-600/50 hover:border-indigo-500/50 hover:bg-indigo-500/5'
                            } ${uploadingImage ? 'opacity-70 cursor-wait' : ''}`}
                        >
                            {uploadingImage ? (
                                <div className="flex flex-col items-center">
                                    <Loader2 className="h-8 w-8 text-indigo-400 animate-spin mb-2" />
                                    <span className="text-sm text-slate-400">Uploading...</span>
                                </div>
                            ) : (
                                <>
                                    <Upload className={`h-8 w-8 mx-auto mb-2 ${dragActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                                    <p className="text-sm text-slate-300">
                                        {dragActive ? 'Drop image to upload' : featuredImage ? 'Drop or click to replace image' : 'Click or drop image to upload'}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">JPG, PNG, WEBP, GIF, SVG (max 10MB)</p>
                                </>
                            )}
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                        />

                        <input
                            type="text"
                            value={featuredImage}
                            onChange={(e) => setFeaturedImage(e.target.value)}
                            placeholder="Or paste image URL..."
                            className="input-dark text-xs"
                        />
                    </div>

                    <div className="card-dark p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-white flex items-center">
                            <Tag className="h-4 w-4 mr-2 text-violet-400" />
                            Tags
                        </h3>

                        {selectedTags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {selectedTags.map((tag, i) => (
                                    <span key={i} className="flex items-center gap-1 px-2.5 py-1 bg-indigo-500/15 text-indigo-300 text-xs rounded-full border border-indigo-500/25">
                                        {tag}
                                        <button onClick={() => removeTag(tag)} className="hover:text-indigo-200">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="relative">
                            <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleTagKeyDown}
                                placeholder="Add tags (press Enter)..."
                                className="input-dark text-sm"
                            />

                            {filteredSuggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-10 max-h-32 overflow-y-auto">
                                    {filteredSuggestions.map(tag => (
                                        <button
                                            key={tag.id}
                                            onClick={() => handleAddTag(tag.name)}
                                            className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
                                        >
                                            {tag.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="card-dark p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-white flex items-center">
                            <FileText className="h-4 w-4 mr-2 text-emerald-400" />
                            Excerpt
                        </h3>
                        <textarea
                            value={excerpt}
                            onChange={(e) => setExcerpt(e.target.value)}
                            rows={3}
                            placeholder="Brief summary of the post..."
                            className="input-dark text-sm resize-none"
                        />
                    </div>

                    <div className="card-dark p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-white flex items-center">
                            <Globe className="h-4 w-4 mr-2 text-amber-400" />
                            SEO Meta Description
                        </h3>
                        <textarea
                            value={metaDescription}
                            onChange={(e) => setMetaDescription(e.target.value)}
                            rows={2}
                            maxLength={160}
                            placeholder="SEO-friendly description (max 160 chars)..."
                            className="input-dark text-sm resize-none"
                        />
                        <p className="text-xs text-slate-500 text-right">{metaDescription.length}/160</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
