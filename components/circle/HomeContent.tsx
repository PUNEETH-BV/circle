'use client';

import { useRouter } from 'next/navigation';
import { Plus, UserPlus, CircleDot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CircleCard } from './CircleCard';
import { EmptyState } from '@/components/shared/EmptyState';
import type { Circle, Profile } from '@/types';

interface HomeContentProps {
  profile: Profile | null;
  circles: Circle[];
}

export function HomeContent({ profile, circles }: HomeContentProps) {
  const router = useRouter();

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-slate-500 mt-1">Here are your circles</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push('/join-circle')}>
            <UserPlus className="w-4 h-4 mr-2" />
            Join a Circle
          </Button>
          <Button onClick={() => router.push('/create-circle')}>
            <Plus className="w-4 h-4 mr-2" />
            Create a Circle
          </Button>
        </div>
      </div>

      {/* Circles grid */}
      {circles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {circles.map((circle) => (
            <CircleCard key={circle.id} circle={circle} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={CircleDot}
          title="You haven't joined any circles yet"
          description="Create a new circle to start collaborating with your team, or join an existing one with an invite code."
          actionLabel="Create a Circle"
          onAction={() => router.push('/create-circle')}
          secondaryActionLabel="Join a Circle"
          onSecondaryAction={() => router.push('/join-circle')}
        />
      )}
    </div>
  );
}
