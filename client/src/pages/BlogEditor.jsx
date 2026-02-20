import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Marked } from 'marked';
import {
    ArrowLeft, Save, Globe, Image as ImageIcon, X,
    Upload, Tag, FileText, Eye, Loader2, Check, Clock3, Type, ScanText, Trash2
} from 'lucide-react';
import { blogService, uploadService } from '../services/api';
import { useDatabaseMode } from '../context/DatabaseModeContext';

/* ─── Register custom Quill Blots so Quill can persist elements it does not
 *     support natively (horizontal rules and full HTML tables). ──────────── */
const QuillCore = ReactQuill.Quill;
if (QuillCore) {
    const BlockEmbed = QuillCore.import('blots/block/embed');

    /** Horizontal-rule blot — lets `<hr>` survive the Delta round-trip. */
    class DividerBlot extends BlockEmbed {
        static create() { return super.create(); }
        static value()  { return true; }
    }
    DividerBlot.blotName = 'divider';
    DividerBlot.tagName  = 'hr';
    QuillCore.register(DividerBlot, true);

    /** Wraps an entire `<table>` as a single non-editable block embed so
     *  Quill preserves it verbatim in the Delta model. */
    class TableBlockBlot extends BlockEmbed {
        static create(value) {
            const node = super.create();
            if (typeof value === 'string') node.innerHTML = value;
            node.setAttribute('contenteditable', 'false');
            return node;
        }
        static value(node) { return node.innerHTML; }
    }
    TableBlockBlot.blotName  = 'table-block';
    TableBlockBlot.tagName   = 'figure';
    TableBlockBlot.className = 'ql-table-wrapper';
    QuillCore.register(TableBlockBlot, true);
}

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
    'header', 'font', 'size', 'bold', 'italic', 'underline', 'strike',
    'script', 'color', 'background', 'list', 'indent', 'align', 'direction',
    'blockquote', 'code-block', 'code', 'link', 'image', 'video',
    'divider', 'table-block'
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
const MARKDOWN_FILE_EXTENSION_PATTERN = /\.(md|markdown|mdown|mkdn|mkd)$/i;
const MARKDOWN_MIME_TYPES = new Set([
    'text/markdown',
    'text/x-markdown',
    'application/x-markdown'
]);
const HTML_TAG_REGEX = /<\/?[a-z][\w:-]*(\s[^>]*)?>/i;
const MARKDOWN_TABLE_SEPARATOR_PATTERN = /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/m;
const ALLOWED_EDITOR_WRAPPER_TAGS = new Set(['p', 'br']);
const markdownParser = new Marked({
    gfm: true,
    breaks: true,
    async: false
});
const MARKDOWN_BLOCK_PATTERNS = [
    /^\s{0,3}#{1,6}(?:\s+|$)/m,
    /^\s{0,3}>\s+/m,
    /^\s{0,3}([-*_]){3,}\s*$/m,
    /^\s{0,3}(\*|-|\+)\s+/m,
    /^\s{0,3}\d+\.\s+/m,
    /^\s{0,3}```/m,
    /^\s{0,3}~~~/m,
    /^\s{0,3}\|.+\|\s*$/m,
    MARKDOWN_TABLE_SEPARATOR_PATTERN,
    /^\s{0,3}- \[[ xX]\]\s+/m
];
const MARKDOWN_INLINE_PATTERNS = [
    /!\[.*?\]\(.*?\)/,
    /\[.+?\]\((?:https?:\/\/|\/|mailto:).+?\)/,
    /(^|[^*])\*\*[^*\n]+\*\*(?!\*)/,
    /(^|[^_])__[^_\n]+__(?!_)/,
    /(^|[^`])`[^`\n]+`(?!`)/,
    /~~[^~\n]+~~/
];

const stripHtml = (html = '') => {
    return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const extractHtmlFromPlainText = (plainText = '') => {
    const trimmed = plainText.trim();
    if (!trimmed) return '';
    if (HTML_TAG_REGEX.test(trimmed)) return trimmed;
    if (!trimmed.includes('&lt;')) return '';

    const decoded = new DOMParser().parseFromString(trimmed, 'text/html').documentElement.textContent || '';
    return HTML_TAG_REGEX.test(decoded) ? decoded : '';
};

const extractTextFromHtml = (html = '') => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return (doc.body?.textContent || '').trim();
};

const extractEditorText = (html = '') => {
    return html
        .replace(/<\/?p[^>]*>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .trim();
};

const hasOnlyEditorWrapperTags = (html = '') => {
    if (!html.trim()) return true;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const tags = Array.from(doc.body.querySelectorAll('*'));
    return tags.every((node) => ALLOWED_EDITOR_WRAPPER_TAGS.has(node.tagName.toLowerCase()));
};

const looksLikeMarkdown = (plainText = '') => {
    const trimmed = plainText.trim();
    if (!trimmed) return false;
    if (HTML_TAG_REGEX.test(trimmed)) return false;

    if (MARKDOWN_BLOCK_PATTERNS.some((pattern) => pattern.test(trimmed))) {
        return true;
    }

    const inlineHitCount = MARKDOWN_INLINE_PATTERNS.reduce((count, pattern) => (
        count + (pattern.test(trimmed) ? 1 : 0)
    ), 0);

    return inlineHitCount >= 2 || (inlineHitCount >= 1 && trimmed.includes('\n'));
};

const hasStrongMarkdownSignals = (plainText = '') => {
    const trimmed = plainText.trim();
    if (!trimmed || HTML_TAG_REGEX.test(trimmed)) return false;

    return (
        /^\s{0,3}#{1,6}(?:\s+|$)/m.test(trimmed)
        || MARKDOWN_TABLE_SEPARATOR_PATTERN.test(trimmed)
        || /^\s{0,3}```/m.test(trimmed)
        || /^\s{0,3}~~~/m.test(trimmed)
        || /^\s{0,3}- \[[ xX]\]\s+/m.test(trimmed)
        || /^\s{0,3}>\s+/m.test(trimmed)
        || /^\s{0,3}(\*|-|\+)\s+/m.test(trimmed)
        || /^\s{0,3}\d+\.\s+/m.test(trimmed)
    );
};

const hasMarkdownStructureSignals = (plainText = '') => {
    const trimmed = plainText.trim();
    if (!trimmed || HTML_TAG_REGEX.test(trimmed)) return false;

    if (
        /^\s{0,3}#{1,6}(?:\s+|$)/m.test(trimmed)
        || MARKDOWN_TABLE_SEPARATOR_PATTERN.test(trimmed)
        || /^\s{0,3}```/m.test(trimmed)
        || /^\s{0,3}~~~/m.test(trimmed)
        || /^\s{0,3}>\s+/m.test(trimmed)
        || /^\s{0,3}- \[[ xX]\]\s+/m.test(trimmed)
    ) {
        return true;
    }

    const unorderedMatches = trimmed.match(/^\s{0,3}(\*|-|\+)\s+/gm) || [];
    const orderedMatches = trimmed.match(/^\s{0,3}\d+\.\s+/gm) || [];
    if (unorderedMatches.length >= 2 || orderedMatches.length >= 2) {
        return true;
    }

    const inlineHitCount = MARKDOWN_INLINE_PATTERNS.reduce((count, pattern) => (
        count + (pattern.test(trimmed) ? 1 : 0)
    ), 0);
    return inlineHitCount >= 2 && trimmed.includes('\n');
};

const swallowClipboardEvent = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
    }
};

const normalizeClipboardText = (text = '') => text.replace(/\r\n/g, '\n');

const isMarkdownFile = (file) => {
    if (!file) return false;
    const fileName = typeof file.name === 'string' ? file.name : '';
    const mimeType = typeof file.type === 'string' ? file.type.toLowerCase() : '';
    return MARKDOWN_FILE_EXTENSION_PATTERN.test(fileName) || MARKDOWN_MIME_TYPES.has(mimeType);
};

const isEditorEffectivelyEmpty = (html = '') => {
    const plainText = stripHtml(html).replace(/\u200B/g, '').trim();
    return plainText.length === 0;
};

const sanitizePastedHtml = (html = '') => {
    if (!html) return '';

    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script, style, iframe, object, embed').forEach((node) => node.remove());

    doc.querySelectorAll('*').forEach((node) => {
        for (const attr of Array.from(node.attributes)) {
            const name = attr.name.toLowerCase();
            const value = attr.value.trim().toLowerCase();
            if (name.startsWith('on')) {
                node.removeAttribute(attr.name);
                continue;
            }
            if ((name === 'href' || name === 'src') && value.startsWith('javascript:')) {
                node.removeAttribute(attr.name);
            }
        }
    });

    return doc.body.innerHTML;
};

const markdownToHtml = (markdown = '') => {
    try {
        const parsed = markdownParser.parse(markdown);
        return sanitizePastedHtml(typeof parsed === 'string' ? parsed : '');
    } catch (err) {
        console.error('Markdown→HTML conversion failed:', err);
        return '';
    }
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

/* ─── Quill HTML pre-/post-processing helpers ───────────────────────────── */

/** Wrap bare `<table>` elements in the custom TableBlockBlot wrapper
 *  so Quill can represent them in its Delta model. */
const wrapTablesForQuill = (html) => {
    if (!html || !html.includes('<table')) return html || '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('table').forEach((table) => {
        if (table.closest('.ql-table-wrapper')) return;          // already wrapped
        const wrapper = doc.createElement('figure');
        wrapper.className = 'ql-table-wrapper';
        wrapper.setAttribute('contenteditable', 'false');
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
    });
    return doc.body.innerHTML;
};

/** Convert `marked`'s task-list checkbox HTML to plain-text markers
 *  (Quill has no native checkbox-in-list blot). */
const convertTaskListsForQuill = (html) => {
    return html
        .replace(/<li>\s*<input\s+[^>]*checked[^>]*\/?>\s*/gi, '<li>☑ ')
        .replace(/<li>\s*<input\s+[^>]*type=["']checkbox["'][^>]*\/?>\s*/gi, '<li>☐ ');
};

/** Normalise `<del>` → `<s>` so Quill's native strike-through format picks it up. */
const normaliseStrikethrough = (html) => {
    return html.replace(/<del>/gi, '<s>').replace(/<\/del>/gi, '</s>');
};

/** Full pre-processing pipeline: Markdown/HTML → Quill-ready HTML. */
const preprocessHtmlForQuill = (html) => {
    if (!html) return '';
    let out = html;
    out = normaliseStrikethrough(out);
    out = convertTaskListsForQuill(out);
    out = wrapTablesForQuill(out);
    return out;
};

/** Strip editor-only wrappers so the persisted HTML stays clean. */
const cleanContentForSave = (html) => {
    if (!html) return html;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('figure.ql-table-wrapper').forEach((wrapper) => {
        const table = wrapper.querySelector('table');
        if (table) {
            wrapper.replaceWith(table);
        } else {
            wrapper.remove();
        }
    });
    doc.querySelectorAll('[contenteditable]').forEach((el) => {
        el.removeAttribute('contenteditable');
    });
    return doc.body.innerHTML;
};

/* ─── Detect & convert raw-markdown content already stored in the DB ────── */
const SEMANTIC_TAG = /<(?:h[1-6]|ul|ol|li|table|blockquote|pre|code|hr|strong|em|del|a\s)[\s>]/i;

const contentLooksLikeRawMarkdown = (html) => {
    if (!html) return false;
    if (SEMANTIC_TAG.test(html)) return false;
    if (!hasOnlyEditorWrapperTags(html)) return false;
    const stripped = extractEditorText(html);
    if (!stripped) return false;
    return hasMarkdownStructureSignals(stripped);
};

const convertStoredMarkdownToHtml = (rawContent) => {
    const stripped = extractEditorText(rawContent)
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
    try {
        const result = markdownParser.parse(stripped);
        const html = typeof result === 'string' ? result : rawContent;
        return preprocessHtmlForQuill(sanitizePastedHtml(html));
    } catch {
        return rawContent;
    }
};

export default function BlogEditor() {
    const { id } = useParams();
    const isEditing = Boolean(id);
    const navigate = useNavigate();
    const { dbMode, dbTargets } = useDatabaseMode();

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
    const [savingToProduction, setSavingToProduction] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadingEditorImage, setUploadingEditorImage] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [error, setError] = useState('');
    const [editorViewMode, setEditorViewMode] = useState('write');

    const fileInputRef = useRef(null);
    const editorImageInputRef = useRef(null);
    const markdownInputRef = useRef(null);
    const quillRef = useRef(null);

    useEffect(() => {
        if (isEditing) loadBlog();
        loadTags();
    }, [id]);

    useEffect(() => {
        const handleShortcutSave = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                if (!saving && !publishing && !savingToProduction) {
                    handleSave('draft');
                }
            }
        };
        window.addEventListener('keydown', handleShortcutSave);
        return () => window.removeEventListener('keydown', handleShortcutSave);
    }, [saving, publishing, savingToProduction, title, content, excerpt, metaDescription, featuredImage, selectedTags, status, id]);

    const loadBlog = async () => {
        try {
            setLoading(true);
            const res = await blogService.getBlog(id);
            const blog = res.data.blog;
            setTitle(blog.title || '');
            // If previously-saved content is raw markdown (not HTML), convert it
            let loadedContent = blog.content || '';
            if (loadedContent && contentLooksLikeRawMarkdown(loadedContent)) {
                loadedContent = convertStoredMarkdownToHtml(loadedContent);
            }
            setContent(wrapTablesForQuill(loadedContent));
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

    const showSaveMessage = useCallback((msg) => {
        setSaveMessage(msg);
        setTimeout(() => setSaveMessage(''), 3000);
    }, []);

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
    }, [showSaveMessage]);

    const handleEditorToolbarImage = useCallback(() => {
        if (uploadingEditorImage) return;
        editorImageInputRef.current?.click();
    }, [uploadingEditorImage]);

    const insertHtmlAtCursor = useCallback((html) => {
        if (!html) return;
        const quill = quillRef.current?.getEditor();
        if (!quill) return;

        // Sanitise, then run through the full Quill-compat pipeline
        let processed = sanitizePastedHtml(html);
        processed = preprocessHtmlForQuill(processed);

        const selection = quill.getSelection(true);
        const index = selection?.index ?? quill.getLength();

        // Replace any selected text first
        if (selection && selection.length > 0) {
            quill.deleteText(index, selection.length, 'silent');
        }

        quill.clipboard.dangerouslyPasteHTML(index, processed, 'user');

        // Let Quill finish its internal update before syncing React state
        requestAnimationFrame(() => {
            setContent(quill.root.innerHTML);
        });
    }, []);

    const replaceEditorContentWithHtml = useCallback((html) => {
        if (!html) return false;
        const quill = quillRef.current?.getEditor();
        if (!quill) {
            setContent(preprocessHtmlForQuill(sanitizePastedHtml(html)));
            return true;
        }

        const processed = preprocessHtmlForQuill(sanitizePastedHtml(html));
        quill.setText('', 'silent');
        quill.clipboard.dangerouslyPasteHTML(0, processed, 'user');

        requestAnimationFrame(() => {
            setContent(quill.root.innerHTML);
            quill.setSelection(0, 0, 'silent');
        });
        return true;
    }, []);

    const insertMarkdownAtCursor = useCallback((markdownText, successMessage = '') => {
        const normalizedMarkdown = normalizeClipboardText(markdownText || '').trim();
        if (!normalizedMarkdown) return false;

        const markdownHtml = markdownToHtml(normalizedMarkdown);
        if (!markdownHtml) return false;

        insertHtmlAtCursor(markdownHtml);
        if (successMessage) {
            showSaveMessage(successMessage);
        }
        return true;
    }, [insertHtmlAtCursor, showSaveMessage]);

    const importMarkdownFile = useCallback(async (file, { replaceContent = false } = {}) => {
        if (!file || !isMarkdownFile(file)) {
            setError('Please choose a valid Markdown file (.md or .markdown).');
            return false;
        }

        try {
            setError('');
            const rawMarkdown = normalizeClipboardText(await file.text());
            if (!rawMarkdown.trim()) {
                setError('Markdown file is empty.');
                return false;
            }

            const fileLabel = file.name || 'Markdown file';
            if (replaceContent) {
                const markdownHtml = markdownToHtml(rawMarkdown);
                if (!markdownHtml) {
                    setError('Unable to parse markdown file.');
                    return false;
                }
                replaceEditorContentWithHtml(markdownHtml);
                setEditorViewMode('preview');
                showSaveMessage(`✅ Imported ${fileLabel}`);
                return true;
            }

            const inserted = insertMarkdownAtCursor(rawMarkdown, `✅ Rendered ${fileLabel}`);
            if (!inserted) {
                setError('Unable to parse markdown file.');
                return false;
            }
            return true;
        } catch (err) {
            setError('Failed to read markdown file.');
            console.error('Markdown import error:', err);
            return false;
        }
    }, [insertMarkdownAtCursor, replaceEditorContentWithHtml, showSaveMessage]);

    const handleImportMarkdownClick = useCallback(() => {
        markdownInputRef.current?.click();
    }, []);

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

            /** Core paste handler — shared between document & editor-root listeners. */
            const handlePaste = async (event) => {
                const clipboardData = event.clipboardData;
                if (!clipboardData) return false;
                const items = Array.from(clipboardData.items || []);

                /* ── 0. Markdown-file paste from OS clipboard ───────────── */
                for (const item of items) {
                    if (item.kind !== 'file') continue;
                    const file = item.getAsFile();
                    if (!isMarkdownFile(file)) continue;

                    swallowClipboardEvent(event);
                    const rawMarkdown = normalizeClipboardText(await file.text());
                    if (!rawMarkdown.trim()) {
                        setError('Markdown file is empty.');
                        return true;
                    }

                    const fileLabel = file.name || 'Markdown file';
                    const inserted = insertMarkdownAtCursor(rawMarkdown, `✅ Rendered ${fileLabel}`);
                    if (!inserted) {
                        setError('Unable to parse markdown file.');
                    }
                    return true;
                }

                /* ── 1. Collect all clipboard representations ────────────── */
                const markdownMimeText = clipboardData.getData('text/markdown')
                    || clipboardData.getData('text/x-markdown')
                    || '';
                const plainText  = clipboardData.getData('text/plain') || '';
                const htmlFromCb = clipboardData.getData('text/html')  || '';

                /* Prefer explicit markdown MIME; fallback to plain text. */
                const fallbackTextFromHtml = extractTextFromHtml(htmlFromCb);
                const markdownSourceRaw = markdownMimeText.trim()
                    ? markdownMimeText
                    : (plainText.trim() ? plainText : fallbackTextFromHtml);
                const markdownSource = normalizeClipboardText(markdownSourceRaw);

                /* ── 2. Markdown detection (aggressive) ─────────────────── */
                const shouldParseAsMarkdown = Boolean(markdownSource.trim()) && (
                    Boolean(markdownMimeText.trim())
                    || looksLikeMarkdown(markdownSource)
                    || hasStrongMarkdownSignals(markdownSource)
                );

                if (shouldParseAsMarkdown) {
                    const markdownHtml = markdownToHtml(markdownSource);
                    if (markdownHtml) {
                        swallowClipboardEvent(event);
                        insertHtmlAtCursor(markdownHtml);
                        return true;
                    }
                }

                /* ── 3. Rich-HTML fallback ──────────────────────────────── */
                const htmlFromPlainText = extractHtmlFromPlainText(plainText);
                const htmlCandidate = HTML_TAG_REGEX.test(htmlFromCb)
                    ? htmlFromCb
                    : htmlFromPlainText;

                if (htmlCandidate) {
                    swallowClipboardEvent(event);
                    insertHtmlAtCursor(htmlCandidate);
                    return true;
                }

                /* ── 4. Image-only paste ────────────────────────────────── */
                const hasTextPayload = plainText.trim().length > 0 || htmlFromCb.trim().length > 0;
                const imageItems = items.filter((item) => item.type?.startsWith('image/'));
                if (imageItems.length === 0) return false;
                if (hasTextPayload) return false;

                swallowClipboardEvent(event);
                let index = quill.getSelection(true)?.index ?? quill.getLength();
                for (const item of imageItems) {
                    const file = item.getAsFile();
                    if (!file) continue;
                    await uploadEditorImage(file, index);
                    index += 1;
                }
                return true;
            };

            /* Handler for document-level capture (fires before any child). */
            const onDocumentPaste = async (event) => {
                const eventTarget = event.target;
                const targetNode = eventTarget instanceof Node ? eventTarget : null;
                const isInsideEditor = Boolean(targetNode && quill.root.contains(targetNode));
                if (!isInsideEditor && !quill.hasFocus()) return;
                await handlePaste(event);
            };

            /* Backup handler directly on the editor root — catches anything
               that slips past the document-level listener. */
            const onEditorPaste = async (event) => {
                // Only run if the document handler didn't already stop propagation
                if (event.defaultPrevented) return;
                await handlePaste(event);
            };

            const onDrop = async (event) => {
                const files = Array.from(event.dataTransfer?.files || []);
                const markdownFile = files.find((file) => isMarkdownFile(file));
                if (markdownFile) {
                    event.preventDefault();
                    await importMarkdownFile(markdownFile, { replaceContent: false });
                    return;
                }

                const imageFiles = files.filter((file) => file.type?.startsWith('image/'));
                if (imageFiles.length === 0) return;

                event.preventDefault();
                let index = quill.getSelection(true)?.index ?? quill.getLength();
                for (const file of imageFiles) {
                    await uploadEditorImage(file, index);
                    index += 1;
                }
            };

            /* Attach handlers — capture phase so we run before Quill's own
               clipboard module. */
            document.addEventListener('paste', onDocumentPaste, true);
            quill.root.addEventListener('paste', onEditorPaste, true);
            quill.root.addEventListener('drop', onDrop);

            detachListeners = () => {
                document.removeEventListener('paste', onDocumentPaste, true);
                quill.root.removeEventListener('paste', onEditorPaste, true);
                quill.root.removeEventListener('drop', onDrop);
            };
        };

        bindListeners();

        return () => {
            canceled = true;
            detachListeners();
        };
    }, [uploadEditorImage, insertHtmlAtCursor, insertMarkdownAtCursor, importMarkdownFile]);

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

    const handleMarkdownFileInputChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            event.target.value = '';
            return;
        }

        const shouldReplace = isEditorEffectivelyEmpty(content)
            || window.confirm('Replace current editor content with this Markdown file?');

        if (shouldReplace) {
            await importMarkdownFile(file, { replaceContent: true });
        }

        event.target.value = '';
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

    const buildSavePayload = useCallback(async (finalStatus) => {
        if (!title.trim()) {
            throw new Error('Title is required');
        }
        if (!content.trim() || content === '<p><br></p>') {
            throw new Error('Content is required');
        }

        let finalContent = content;
        if (contentLooksLikeRawMarkdown(finalContent)) {
            finalContent = convertStoredMarkdownToHtml(finalContent);
            setContent(finalContent);
        }
        if (finalContent.includes('data:image/')) {
            finalContent = await replaceEmbeddedImagesWithUploads(finalContent);
            setContent(finalContent);
        }

        finalContent = cleanContentForSave(finalContent);

        return {
            title: title.trim(),
            content: finalContent,
            excerpt: excerpt.trim(),
            featured_image: featuredImage,
            status: finalStatus,
            meta_description: metaDescription.trim(),
            tags: selectedTags
        };
    }, [title, content, excerpt, featuredImage, metaDescription, selectedTags, replaceEmbeddedImagesWithUploads]);

    const handleSave = async (publishStatus = null) => {
        const finalStatus = publishStatus || status;
        const isPublishingAction = finalStatus === 'published';

        try {
            if (isPublishingAction) setPublishing(true);
            else setSaving(true);
            setError('');

            const payload = await buildSavePayload(finalStatus);

            let res;
            if (isEditing) {
                res = await blogService.updateBlog(id, payload);
            } else {
                res = await blogService.createBlog(payload);
            }

            setStatus(finalStatus);
            showSaveMessage(isPublishingAction ? '✅ Published!' : '✅ Saved!');

            if (!isEditing && res.data.blog?.id) {
                navigate(`/blogs/edit/${res.data.blog.id}`, { replace: true });
            }
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Failed to save');
            console.error(err);
        } finally {
            setSaving(false);
            setPublishing(false);
        }
    };

    const handleSaveToProduction = async () => {
        if (!isEditing || dbMode !== dbTargets.TEST) return;

        try {
            setSavingToProduction(true);
            setError('');

            const payload = await buildSavePayload('draft');

            try {
                await blogService.updateBlog(id, payload, { dbTarget: dbTargets.PRODUCTION });
            } catch (err) {
                if (err.response?.status === 404) {
                    await blogService.createBlog(payload, { dbTarget: dbTargets.PRODUCTION });
                } else {
                    throw err;
                }
            }

            showSaveMessage('✅ Saved to production DB');
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Failed to save to production DB');
            console.error(err);
        } finally {
            setSavingToProduction(false);
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
    const editorPreviewHtml = useMemo(() => {
        if (!content) return '';
        const normalizedContent = contentLooksLikeRawMarkdown(content)
            ? convertStoredMarkdownToHtml(content)
            : content;
        return sanitizePastedHtml(cleanContentForSave(normalizedContent));
    }, [content]);
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
        <div className="space-y-6 max-w-6xl mx-auto min-w-0">
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
                        disabled={saving || publishing || savingToProduction}
                        className="flex items-center px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700/50 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                        Save Draft
                    </button>

                    {isEditing && dbMode === dbTargets.TEST && (
                        <button
                            onClick={handleSaveToProduction}
                            disabled={savingToProduction || saving || publishing}
                            className="flex items-center px-4 py-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 hover:text-rose-200 hover:bg-rose-500/20 text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            {savingToProduction ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Globe className="h-4 w-4 mr-1.5" />}
                            Save to Production DB
                        </button>
                    )}

                    <button
                        onClick={() => handleSave('published')}
                        disabled={publishing || saving || savingToProduction}
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
                {/* Main Editor — 2 cols */}
                <div className="lg:col-span-2 space-y-6 min-w-0">
                    <div className="card-dark p-6">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter your blog title..."
                            className="w-full text-2xl font-bold text-white bg-transparent border-none outline-none placeholder-slate-500"
                        />
                    </div>

                    <div className="card-dark overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-900/40 flex flex-wrap items-center justify-between gap-3">
                            <div className="inline-flex items-center rounded-lg border border-slate-700/60 bg-slate-900/50 p-1">
                                <button
                                    type="button"
                                    onClick={() => setEditorViewMode('write')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                                        editorViewMode === 'write'
                                            ? 'bg-indigo-500/20 text-indigo-200'
                                            : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    Write
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditorViewMode('preview')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                                        editorViewMode === 'preview'
                                            ? 'bg-indigo-500/20 text-indigo-200'
                                            : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    Preview
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleImportMarkdownClick}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-600/60 bg-slate-800/50 text-slate-200 text-xs hover:bg-slate-700/50 transition-colors"
                                >
                                    <FileText className="h-3.5 w-3.5" />
                                    Import .md
                                </button>
                                <span className="text-[11px] text-slate-500">Paste markdown or drop a `.md` file</span>
                            </div>
                        </div>

                        <div className={`${editorViewMode === 'write' ? 'block' : 'hidden'} blog-editor`}>
                            <ReactQuill
                                ref={quillRef}
                                value={content}
                                onChange={setContent}
                                modules={quillModules}
                                formats={QUILL_FORMATS}
                                placeholder="Start writing your blog post..."
                                theme="snow"
                            />
                        </div>

                        {editorViewMode === 'preview' && (
                            <div className="p-6 sm:p-8 min-h-[420px] min-w-0">
                                {editorPreviewHtml ? (
                                    <div
                                        className="blog-content prose prose-invert prose-lg max-w-none min-w-0"
                                        dangerouslySetInnerHTML={{ __html: editorPreviewHtml }}
                                    />
                                ) : (
                                    <p className="text-slate-500 text-sm">Nothing to preview yet. Start writing or import markdown.</p>
                                )}
                            </div>
                        )}

                        <input
                            ref={editorImageInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleEditorImageInputChange}
                            className="hidden"
                        />

                        <input
                            ref={markdownInputRef}
                            type="file"
                            accept=".md,.markdown,text/markdown,text/plain"
                            onChange={handleMarkdownFileInputChange}
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
