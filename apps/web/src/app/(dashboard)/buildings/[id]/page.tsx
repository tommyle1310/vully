'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import { Building, MapPin, Layers, ArrowLeft, Upload, Pencil } from 'lucide-react';
import { useBuilding } from '@/hooks/use-buildings';
import { useApartments } from '@/hooks/use-apartments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { FloorPlan } from '@/components/maps/floor-plan';
import { ApartmentDetailPanel } from '@/components/maps/apartment-detail-panel';
import { MapControls } from '@/components/maps/map-controls';
import { SvgUploadDialog } from '@/components/maps/svg-upload-dialog';
import { SvgBuilderDialog } from '@/components/maps/svg-builder-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function BuildingDetailPage() {
  const params = useParams();
  const buildingId = params.id as string;

  const { data: buildingData, isLoading: buildingLoading, refetch: refetchBuilding } = useBuilding(buildingId);
  const { data: apartmentsData, isLoading: apartmentsLoading } = useApartments({ buildingId });
  
  const [selectedApartmentId, setSelectedApartmentId] = useState<string | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [svgUploadOpen, setSvgUploadOpen] = useState(false);
  const [svgBuilderOpen, setSvgBuilderOpen] = useState(false);

  const building = buildingData?.data;
  const apartments = apartmentsData?.data || [];

  // Calculate apartment counts by status
  const apartmentCounts = {
    total: apartments.length,
    vacant: apartments.filter((a) => a.status === 'vacant').length,
    occupied: apartments.filter((a) => a.status === 'occupied').length,
    maintenance: apartments.filter((a) => a.status === 'maintenance').length,
    reserved: apartments.filter((a) => a.status === 'reserved').length,
  };

  const selectedApartment = apartments.find((a) => a.id === selectedApartmentId) || null;

  const handleApartmentClick = (apartmentId: string) => {
    setSelectedApartmentId(apartmentId);
    setDetailPanelOpen(true);
  };

  if (buildingLoading || apartmentsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <Skeleton className="h-[600px] w-full" />
          </div>
          <div className="lg:col-span-1">
            <Skeleton className="h-[300px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!building) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <Building className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Building Not Found</h2>
        <p className="text-muted-foreground mb-4">The building you're looking for doesn't exist.</p>
        <Button asChild>
          <a href="/buildings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Buildings
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Button variant="ghost" size="sm" asChild>
              <a href="/buildings">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Buildings
              </a>
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Building className="h-8 w-8" />
            {building.name}
          </h1>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {building.address}, {building.city}
            </span>
            <span className="flex items-center gap-1">
              <Layers className="h-4 w-4" />
              {building.floorCount} floors
            </span>
          </div>
        </div>
        
        {/* Floor Plan Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              {building.svgMapData ? (
                <>
                  <Pencil className="mr-2 h-4 w-4" />
                  Manage Floor Plan
                </>
              ) : (
                <>
                  <Building className="mr-2 h-4 w-4" />
                  Add Floor Plan
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSvgBuilderOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              {building.svgMapData ? 'Edit with Builder' : 'Build Floor Plan'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSvgUploadOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              {building.svgMapData ? 'Replace SVG File' : 'Upload SVG File'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Units
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apartmentCounts.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Occupied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {apartmentCounts.occupied}
            </div>
            <p className="text-xs text-muted-foreground">
              {apartmentCounts.total > 0
                ? Math.round((apartmentCounts.occupied / apartmentCounts.total) * 100)
                : 0}
              % occupancy
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vacant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {apartmentCounts.vacant}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {apartmentCounts.maintenance}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map and Controls */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Floor Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-3"
        >
          <FloorPlan
            svgContent={building.svgMapData || ''}
            buildingId={building.id}
            apartments={apartments}
            onApartmentClick={handleApartmentClick}
          />
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1"
        >
          <MapControls
            floorCount={building.floorCount}
            apartmentCounts={apartmentCounts}
          />
        </motion.div>
      </div>


      {/* SVG Upload Dialog */}
      <SvgUploadDialog
        buildingId={buildingId}
        buildingName={building.name}
        open={svgUploadOpen}
        onOpenChange={setSvgUploadOpen}
        onUploadSuccess={() => {
          refetchBuilding();
        }}
      />

      {/* SVG Builder Dialog */}
      <SvgBuilderDialog
        buildingId={buildingId}
        buildingName={building.name}
        existingSvg={building.svgMapData || undefined}
        open={svgBuilderOpen}
        onOpenChange={setSvgBuilderOpen}
        onSaveSuccess={() => {
          refetchBuilding();
        }}
      />

      {/* Apartment Detail Panel */}
      <ApartmentDetailPanel
        apartment={selectedApartment}
        open={detailPanelOpen}
        onOpenChange={setDetailPanelOpen}
      />
    </div>
  );
}
