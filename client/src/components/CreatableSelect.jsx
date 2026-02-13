import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Plus } from 'lucide-react';

const CreatableSelect = ({ label, value, onChange, options = [], placeholder = 'Select or type...' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value || '');
    const wrapperRef = useRef(null);

    useEffect(() => {
        setInputValue(value || '');
    }, [value]);

    const filteredOptions = options.filter(option =>
        option.toLowerCase().includes(inputValue.toLowerCase())
    );

    const showCreateOption = inputValue && !options.some(opt => opt.toLowerCase() === inputValue.toLowerCase());

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e) => {
        const newVal = e.target.value;
        setInputValue(newVal);
        setIsOpen(true);
        onChange(newVal);
    };

    const handleSelectOption = (option) => {
        setInputValue(option);
        onChange(option);
        setIsOpen(false);
    };

    return (
        <div className="relative space-y-1.5" ref={wrapperRef}>
            {label && <label className="block text-sm font-medium text-slate-300">{label}</label>}
            <div className="relative group">
                <input
                    type="text"
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all pr-10"
                    placeholder={placeholder}
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                />
                <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-slate-500 hover:text-indigo-400 transition-colors"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700/50 rounded-lg shadow-xl shadow-black/50 max-h-60 overflow-y-auto overflow-x-hidden animate-in fade-in zoom-in-95 duration-100">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option) => (
                            <button
                                key={option}
                                onClick={() => handleSelectOption(option)}
                                className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white flex items-center justify-between group transition-colors"
                                type="button"
                            >
                                <span>{option}</span>
                                {value === option && <Check className="h-3 w-3 text-indigo-400" />}
                            </button>
                        ))
                    ) : null}

                    {showCreateOption && (
                        <button
                            onClick={() => handleSelectOption(inputValue)}
                            className="w-full text-left px-4 py-2.5 text-sm text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 flex items-center gap-2 border-t border-slate-700/50 backdrop-blur-sm"
                            type="button"
                        >
                            <Plus className="h-3 w-3" />
                            <span>Create "{inputValue}"</span>
                        </button>
                    )}

                    {filteredOptions.length === 0 && !showCreateOption && (
                        <div className="px-4 py-2.5 text-sm text-slate-500 italic">No options found</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CreatableSelect;
