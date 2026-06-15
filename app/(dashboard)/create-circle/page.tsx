'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Copy, RefreshCw, Check, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { generateInviteCode } from '@/lib/utils/generateInviteCode';
import { toast } from 'sonner';
import Link from 'next/link';

// Preset categories users can pick from
const PRESET_CATEGORIES = [
  { name: 'General', emoji: '📁' },
  { name: 'Assignments', emoji: '📝' },
  { name: 'Resources', emoji: '📚' },
  { name: 'Projects', emoji: '🚀' },
  { name: 'Lectures', emoji: '🎓' },
  { name: 'Design', emoji: '🎨' },
  { name: 'Code', emoji: '💻' },
  { name: 'Research', emoji: '🔬' },
  { name: 'Meeting Notes', emoji: '📋' },
  { name: 'Finance', emoji: '💰' },
];

export default function CreateCirclePage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [inviteCode, setInviteCode] = useState(generateInviteCode());
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);
  const [createdCircleId, setCreatedCircleId] = useState('');
  const [copied, setCopied] = useState(false);
  const [nameError, setNameError] = useState('');

  // Category state
  const [selectedPresets, setSelectedPresets] = useState<string[]>(['General']);
  const [customCatInput, setCustomCatInput] = useState('');
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  const togglePreset = (catName: string) => {
    setSelectedPresets(prev =>
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    );
  };

  const addCustomCategory = () => {
    const trimmed = customCatInput.trim();
    if (!trimmed) return;
    const all = [...selectedPresets, ...customCategories];
    if (all.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Category already added');
      return;
    }
    setCustomCategories(prev => [...prev, trimmed]);
    setCustomCatInput('');
  };

  const removeCustomCategory = (catName: string) => {
    setCustomCategories(prev => prev.filter(c => c !== catName));
  };

  const allCategories = [...selectedPresets, ...customCategories];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError('');

    if (!name.trim()) {
      setNameError('Circle name is required');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: circle, error } = await supabase
        .from('circles')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          invite_code: inviteCode,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as admin
      await supabase.from('circle_members').insert({
        circle_id: circle.id,
        user_id: user.id,
        role: 'admin',
      });

      // Insert selected categories (the trigger already creates "General" at position 0,
      // so we insert all chosen ones, skipping "General" to avoid duplicates)
      const categoriesToInsert = allCategories
        .filter(c => c.toLowerCase() !== 'general')
        .map((catName, index) => ({
          circle_id: circle.id,
          name: catName,
          icon: 'Folder',
          position: index + 1,
        }));

      if (categoriesToInsert.length > 0) {
        await supabase.from('categories').insert(categoriesToInsert);
      }

      setCreatedCircleId(circle.id);
      setCreated(true);
      toast.success('Circle created successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create circle');
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/join-circle?code=${inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Invite link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (created) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Circle Created!</h2>
          <p className="text-slate-500 text-sm mb-6">Share this invite code with your team</p>
          <div className="bg-slate-50 rounded-lg p-4 mb-4">
            <p className="text-xs text-slate-400 mb-1">Invite Code</p>
            <p className="text-2xl font-mono font-semibold text-indigo-600 tracking-wider">{inviteCode}</p>
          </div>
          <Button onClick={copyInviteLink} variant="outline" className="w-full mb-3">
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? 'Copied!' : 'Copy Invite Link'}
          </Button>
          <Button onClick={() => { window.location.href = `/circle/${createdCircleId}`; }} className="w-full">
            Go to Circle
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-8">
      <Link href="/" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to home
      </Link>

      <div className="bg-white rounded-xl border border-slate-100 p-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-1">Create a new circle</h2>
        <p className="text-slate-500 text-sm mb-6">Start collaborating with your team</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Circle Name */}
          <div>
            <Label htmlFor="name">Circle Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., CS101 Study Group"
              className="mt-1.5"
            />
            {nameError && <p className="text-sm text-red-500 mt-1">{nameError}</p>}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this circle about?"
              className="mt-1.5"
              rows={3}
            />
          </div>

          {/* Invite Code */}
          <div>
            <Label>Invite Code</Label>
            <div className="flex gap-2 mt-1.5">
              <Input value={inviteCode} readOnly className="font-mono" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setInviteCode(generateInviteCode())}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-slate-400 mt-1">Share this code with people you want to invite</p>
          </div>

          {/* Categories */}
          <div>
            <Label>Categories</Label>
            <p className="text-xs text-slate-400 mt-0.5 mb-3">
              Pick categories to organize files and notes in your circle.
            </p>

            {/* Preset chips */}
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESET_CATEGORIES.map(cat => {
                const selected = selectedPresets.includes(cat.name);
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => togglePreset(cat.name)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selected
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-600'
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.name}</span>
                    {selected && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>

            {/* Custom category input */}
            <div className="flex gap-2">
              <Input
                value={customCatInput}
                onChange={(e) => setCustomCatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomCategory(); } }}
                placeholder="Add a custom category..."
                className="h-9 text-sm"
              />
              <Button type="button" size="sm" variant="outline" className="h-9 gap-1 flex-shrink-0" onClick={addCustomCategory}>
                <Plus className="w-3.5 h-3.5" />
                Add
              </Button>
            </div>

            {/* Custom categories chips */}
            {customCategories.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {customCategories.map(cat => (
                  <span
                    key={cat}
                    className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700 border border-violet-200"
                  >
                    ✨ {cat}
                    <button type="button" onClick={() => removeCustomCategory(cat)} className="ml-0.5 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Summary */}
            {allCategories.length > 0 && (
              <p className="text-xs text-slate-400 mt-2">
                {allCategories.length} categor{allCategories.length === 1 ? 'y' : 'ies'} will be created
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating...' : 'Create Circle'}
          </Button>
        </form>
      </div>
    </div>
  );
}
