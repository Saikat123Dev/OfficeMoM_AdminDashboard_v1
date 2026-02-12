import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Marked } from 'marked';
import {
    ArrowLeft, Edit3, Globe, Clock, Tag, User,
    Calendar, FileLock
} from 'lucide-react';
import { blogService } from '../services/api';

/* ─── Detect whether stored content is raw markdown rather than proper HTML.
 *     If the text (after stripping Quill's wrapping <p> tags) still has many
 *     markdown markers and very few real semantic HTML tags, it's almost
 *     certainly raw markdown that was saved without conversion. ──────────── */
const MARKDOWN_TABLE_SEPARATOR_PATTERN = /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/m;
const ALLOWED_EDITOR_WRAPPER_TAGS = new Set(['p', 'br']);
const markdownParser = new Marked({
    gfm: true,
    breaks: true,
    async: false
});
const MARKDOWN_INLINE_PATTERNS = [
    /!\[.*?\]\(.*?\)/,
    /\[.+?\]\((?:https?:\/\/|\/|mailto:).+?\)/,
    /(^|[^*])\*\*[^*\n]+\*\*(?!\*)/,
    /(^|[^_])__[^_\n]+__(?!_)/,
    /(^|[^`])`[^`\n]+`(?!`)/,
    /~~[^~\n]+~~/
];
const SEMANTIC_HTML_TAG = /<(?:h[1-6]|ul|ol|li|table|blockquote|pre|code|hr|strong|em|del|a\s)[\s>]/i;

function extractEditorText(html = '') {
    return html
        .replace(/<\/?p[^>]*>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .trim();
}

function hasOnlyEditorWrapperTags(html = '') {
    if (!html.trim()) return true;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const tags = Array.from(doc.body.querySelectorAll('*'));
    return tags.every((node) => ALLOWED_EDITOR_WRAPPER_TAGS.has(node.tagName.toLowerCase()));
}

function hasMarkdownStructureSignals(plainText = '') {
    const trimmed = plainText.trim();
    if (!trimmed || /<\/?[a-z][\w:-]*(\s[^>]*)?>/i.test(trimmed)) return false;

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
}

function contentLooksLikeRawMarkdown(html) {
    if (!html) return false;
    if (SEMANTIC_HTML_TAG.test(html)) return false;
    if (!hasOnlyEditorWrapperTags(html)) return false;
    const stripped = extractEditorText(html);
    if (!stripped) return false;
    return hasMarkdownStructureSignals(stripped);
}

/** Convert raw markdown → sanitised HTML for preview. */
function renderMarkdownContent(rawContent) {
    // Strip the wrapping <p> tags that Quill injects around raw text
    const stripped = extractEditorText(rawContent)
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
    try {
        const result = markdownParser.parse(stripped);
        return typeof result === 'string' ? result : stripped;
    } catch {
        return rawContent;
    }
}

export default function BlogPreview() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [blog, setBlog] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBlog();
    }, [id]);

    const loadBlog = async () => {
        try {
            setLoading(true);
            const res = await blogService.getBlog(id);
            setBlog(res.data.blog);
        } catch (err) {
            console.error('Error loading blog:', err);
        } finally {
            setLoading(false);
        }
    };

    /** Compute rendered HTML: if stored content is raw markdown, convert it. */
    const renderedContent = useMemo(() => {
        if (!blog?.content) return '';
        if (contentLooksLikeRawMarkdown(blog.content)) {
            return renderMarkdownContent(blog.content);
        }
        return blog.content;
    }, [blog?.content]);

    const handleToggleStatus = async () => {
        if (!blog) return;
        const newStatus = blog.status === 'published' ? 'draft' : 'published';
        try {
            await blogService.updateStatus(id, newStatus);
            setBlog({ ...blog, status: newStatus });
        } catch (err) {
            console.error('Error updating status:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent" />
            </div>
        );
    }

    if (!blog) {
        return (
            <div className="text-center py-20">
                <h3 className="text-xl font-semibold text-white mb-2">Blog not found</h3>
                <button onClick={() => navigate('/blogs')} className="text-indigo-400 hover:text-indigo-300 text-sm">
                    ← Back to Posts
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto min-w-0">
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
                    <button
                        onClick={handleToggleStatus}
                        className={`flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${blog.status === 'published'
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                            }`}
                    >
                        {blog.status === 'published' ? (
                            <><FileLock className="h-4 w-4 mr-1.5" /> Unpublish</>
                        ) : (
                            <><Globe className="h-4 w-4 mr-1.5" /> Publish</>
                        )}
                    </button>

                    <button
                        onClick={() => navigate(`/blogs/edit/${id}`)}
                        className="btn-gradient flex items-center text-sm"
                    >
                        <Edit3 className="h-4 w-4 mr-1.5" /> Edit Post
                    </button>
                </div>
            </div>

            {/* Preview Card */}
            <article className="card-dark overflow-hidden min-w-0">
                {/* Featured Image */}
                {blog.featured_image && (
                    <div className="relative">
                        <img
                            src={blog.featured_image}
                            alt={blog.title}
                            className="w-full h-64 sm:h-80 object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                    </div>
                )}

                <div className="p-6 sm:p-8 space-y-6">
                    {/* Status Badge */}
                    <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${blog.status === 'published'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                            }`}>
                            {blog.status === 'published' ? '● Published' : '● Draft'}
                        </span>

                        {blog.published_at && blog.status === 'published' && (
                            <span className="text-xs text-slate-500 flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                Published {new Date(blog.published_at).toLocaleDateString('en-US', {
                                    month: 'long', day: 'numeric', year: 'numeric'
                                })}
                            </span>
                        )}
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
                        {blog.title}
                    </h1>

                    {/* Excerpt */}
                    {blog.excerpt && (
                        <p className="text-lg text-slate-400 leading-relaxed border-l-4 border-indigo-500/50 pl-4">
                            {blog.excerpt}
                        </p>
                    )}

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {new Date(blog.updated_at).toLocaleDateString('en-US', {
                                month: 'long', day: 'numeric', year: 'numeric'
                            })}
                        </span>
                        <span className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            Admin
                        </span>
                    </div>

                    {/* Tags */}
                    {blog.tags && blog.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {blog.tags.map((tag, i) => (
                                <span
                                    key={i}
                                    className="flex items-center px-3 py-1.5 bg-indigo-500/10 text-indigo-300 text-sm rounded-full border border-indigo-500/20"
                                >
                                    <Tag className="h-3 w-3 mr-1.5" />
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Divider */}
                    <hr className="border-slate-700/50" />

                    {/* Content */}
                    <div
                        className="blog-content prose prose-invert prose-lg max-w-none min-w-0"
                        dangerouslySetInnerHTML={{ __html: renderedContent }}
                    />

                    {/* Meta Description (SEO) */}
                    {blog.meta_description && (
                        <div className="mt-8 p-4 bg-slate-800/30 rounded-xl border border-slate-700/40">
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center">
                                <Globe className="h-3 w-3 mr-1" />
                                SEO Meta Description
                            </h4>
                            <p className="text-sm text-slate-300">{blog.meta_description}</p>
                        </div>
                    )}
                </div>
            </article>
        </div>
    );
}
