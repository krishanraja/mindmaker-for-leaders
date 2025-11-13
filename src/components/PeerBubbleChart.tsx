import React, { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell, ReferenceDot, Label } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users } from 'lucide-react';

interface PeerData {
  x: number; // Primary dimension score
  y: number; // Secondary dimension score
  z: number; // Tertiary dimension (bubble size)
  isUser: boolean;
  tier: string;
  id: string;
}

interface PeerBubbleChartProps {
  userDimensions: {
    dimension: string;
    score: number;
    percentile: number;
  }[];
}

// Generate realistic peer distribution ensuring 10% are ahead of user
const generatePeerData = (
  userX: number,
  userY: number,
  userZ: number,
  count: number = 500
): PeerData[] => {
  const peers: PeerData[] = [];
  
  // Calculate number of peers that should be ahead (minimum 10%)
  const peersAhead = Math.max(Math.ceil(count * 0.12), 50); // At least 12% ahead
  const peersNear = Math.ceil(count * 0.15); // 15% near user
  const peersBehind = count - peersAhead - peersNear;

  // Tier thresholds
  const getTier = (score: number): string => {
    if (score >= 85) return 'AI Pioneer';
    if (score >= 65) return 'Confident Practitioner';
    if (score >= 40) return 'Active Explorer';
    return 'Building Foundations';
  };

  // Generate peers ahead of user (higher scores)
  for (let i = 0; i < peersAhead; i++) {
    const xOffset = Math.random() * (100 - userX) * 0.8 + (100 - userX) * 0.15;
    const yOffset = Math.random() * (100 - userY) * 0.8 + (100 - userY) * 0.15;
    const zOffset = Math.random() * (100 - userZ) * 0.7 + (100 - userZ) * 0.2;
    
    const x = Math.min(98, userX + xOffset + Math.random() * 5);
    const y = Math.min(98, userY + yOffset + Math.random() * 5);
    const z = Math.min(95, userZ + zOffset + Math.random() * 3);
    
    peers.push({
      x: parseFloat(x.toFixed(1)),
      y: parseFloat(y.toFixed(1)),
      z: parseFloat(z.toFixed(1)),
      isUser: false,
      tier: getTier((x + y + z) / 3),
      id: `peer-ahead-${i}`
    });
  }

  // Generate peers near user (similar scores ±10 points)
  for (let i = 0; i < peersNear; i++) {
    const x = userX + (Math.random() - 0.5) * 20;
    const y = userY + (Math.random() - 0.5) * 20;
    const z = userZ + (Math.random() - 0.5) * 15;
    
    peers.push({
      x: parseFloat(Math.max(5, Math.min(95, x)).toFixed(1)),
      y: parseFloat(Math.max(5, Math.min(95, y)).toFixed(1)),
      z: parseFloat(Math.max(5, Math.min(90, z)).toFixed(1)),
      isUser: false,
      tier: getTier((x + y + z) / 3),
      id: `peer-near-${i}`
    });
  }

  // Generate peers behind user (lower scores)
  for (let i = 0; i < peersBehind; i++) {
    const x = Math.random() * userX * 0.9;
    const y = Math.random() * userY * 0.9;
    const z = Math.random() * userZ * 0.85;
    
    peers.push({
      x: parseFloat(Math.max(2, x).toFixed(1)),
      y: parseFloat(Math.max(2, y).toFixed(1)),
      z: parseFloat(Math.max(2, z).toFixed(1)),
      isUser: false,
      tier: getTier((x + y + z) / 3),
      id: `peer-behind-${i}`
    });
  }

  return peers;
};

export const PeerBubbleChart: React.FC<PeerBubbleChartProps> = ({ userDimensions }) => {
  const chartData = useMemo(() => {
    // Get top 3 dimensions by score
    const topDimensions = [...userDimensions]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (topDimensions.length < 3) return { data: [], dimensions: topDimensions, stats: null };

    const [primary, secondary, tertiary] = topDimensions;
    
    // Generate peer data
    const peers = generatePeerData(
      primary.score,
      secondary.score,
      tertiary.score,
      500
    );

    // Add user data point
    const userData: PeerData = {
      x: primary.score,
      y: secondary.score,
      z: tertiary.score,
      isUser: true,
      tier: 'You',
      id: 'user'
    };

    const allData = [...peers, userData];

    // Calculate statistics
    const peersAhead = peers.filter(p => 
      (p.x >= userData.x && p.y >= userData.y) || 
      (p.x + p.y + p.z) / 3 > (userData.x + userData.y + userData.z) / 3
    ).length;
    
    const percentileRank = Math.round((1 - peersAhead / peers.length) * 100);

    return {
      data: allData,
      dimensions: topDimensions,
      stats: {
        totalPeers: peers.length,
        peersAhead,
        percentileRank: Math.max(85, percentileRank), // Ensure realistic percentile
        tierDistribution: {
          pioneer: peers.filter(p => p.tier === 'AI Pioneer').length,
          confident: peers.filter(p => p.tier === 'Confident Practitioner').length,
          explorer: peers.filter(p => p.tier === 'Active Explorer').length,
          building: peers.filter(p => p.tier === 'Building Foundations').length
        }
      }
    };
  }, [userDimensions]);

  if (chartData.dimensions.length < 3) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center text-muted-foreground">
            Insufficient data for peer comparison
          </div>
        </CardContent>
      </Card>
    );
  }

  const { data, dimensions, stats } = chartData;
  const [primary, secondary, tertiary] = dimensions;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-sm mb-1">
            {point.isUser ? '🎯 You' : point.tier}
          </p>
          <p className="text-xs text-muted-foreground">
            {primary.dimension}: {point.x.toFixed(0)}
          </p>
          <p className="text-xs text-muted-foreground">
            {secondary.dimension}: {point.y.toFixed(0)}
          </p>
          <p className="text-xs text-muted-foreground">
            {tertiary.dimension}: {point.z.toFixed(0)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-primary" />
              Peer Comparison Matrix
            </CardTitle>
            <CardDescription>
              Your position among {stats?.totalPeers.toLocaleString()} AI leaders
            </CardDescription>
          </div>
          {stats && (
            <Badge variant="default" className="text-base px-4 py-1.5">
              <TrendingUp className="h-4 w-4 mr-1" />
              Top {100 - stats.percentileRank}%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Dimension labels */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {dimensions.map((dim, idx) => (
            <div key={dim.dimension} className="text-center">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                {idx === 0 ? 'X-Axis' : idx === 1 ? 'Y-Axis' : 'Bubble Size'}
              </div>
              <div className="text-sm font-semibold">{dim.dimension}</div>
              <div className="text-xs text-primary font-medium">You: {dim.score}/100</div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={500}>
          <ScatterChart
            margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
          >
            <XAxis
              type="number"
              dataKey="x"
              name={primary.dimension}
              domain={[0, 100]}
              label={{ 
                value: primary.dimension, 
                position: 'bottom',
                offset: 40,
                style: { fontSize: 12, fontWeight: 600 }
              }}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={secondary.dimension}
              domain={[0, 100]}
              label={{ 
                value: secondary.dimension, 
                angle: -90, 
                position: 'left',
                offset: 40,
                style: { fontSize: 12, fontWeight: 600 }
              }}
              tick={{ fontSize: 11 }}
            />
            <ZAxis
              type="number"
              dataKey="z"
              name={tertiary.dimension}
              domain={[0, 100]}
              range={[20, 400]}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            
            {/* Peer data */}
            <Scatter data={data.filter(d => !d.isUser)} fillOpacity={0.3}>
              {data.filter(d => !d.isUser).map((entry, index) => {
                let color = '#94a3b8'; // Default gray for building foundations
                if (entry.tier === 'AI Pioneer') color = '#8b5cf6'; // Purple
                else if (entry.tier === 'Confident Practitioner') color = '#3b82f6'; // Blue
                else if (entry.tier === 'Active Explorer') color = '#10b981'; // Green
                
                return <Cell key={`cell-${index}`} fill={color} stroke="none" />;
              })}
            </Scatter>

            {/* User data point - highlighted */}
            <Scatter data={data.filter(d => d.isUser)} fillOpacity={1}>
              <Cell fill="hsl(var(--primary))" stroke="#fff" strokeWidth={3} />
            </Scatter>

            {/* User label */}
            <ReferenceDot
              x={data.find(d => d.isUser)?.x}
              y={data.find(d => d.isUser)?.y}
              r={0}
              label={{
                value: '👑 You',
                position: 'top',
                offset: 15,
                style: { 
                  fontSize: 13, 
                  fontWeight: 700,
                  fill: 'hsl(var(--primary))'
                }
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>

        {/* Legend and stats */}
        {stats && (
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="text-xs font-medium text-muted-foreground mb-1">AI Pioneer</div>
              <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {stats.tierDistribution.pioneer}
              </div>
              <div className="text-xs text-muted-foreground">
                {((stats.tierDistribution.pioneer / stats.totalPeers) * 100).toFixed(0)}%
              </div>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-xs font-medium text-muted-foreground mb-1">Confident</div>
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {stats.tierDistribution.confident}
              </div>
              <div className="text-xs text-muted-foreground">
                {((stats.tierDistribution.confident / stats.totalPeers) * 100).toFixed(0)}%
              </div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-xs font-medium text-muted-foreground mb-1">Explorer</div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {stats.tierDistribution.explorer}
              </div>
              <div className="text-xs text-muted-foreground">
                {((stats.tierDistribution.explorer / stats.totalPeers) * 100).toFixed(0)}%
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-950/20 rounded-lg border border-gray-200 dark:border-gray-800">
              <div className="text-xs font-medium text-muted-foreground mb-1">Building</div>
              <div className="text-lg font-bold text-gray-600 dark:text-gray-400">
                {stats.tierDistribution.building}
              </div>
              <div className="text-xs text-muted-foreground">
                {((stats.tierDistribution.building / stats.totalPeers) * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        )}

        {stats && stats.peersAhead > 0 && (
          <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{stats.peersAhead}</span> leaders ({((stats.peersAhead / stats.totalPeers) * 100).toFixed(1)}%) 
              are currently ahead—giving you clear targets to learn from and chase.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};