import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, GripVertical, Plus, Target } from 'lucide-react';
import { DiagnosticData } from '../../types/diagnostic';

interface PriorityOrderingSectionProps {
  data: DiagnosticData;
  onUpdate: (data: Partial<DiagnosticData>) => void;
  onComplete: () => void;
  isComplete: boolean;
}

const productivityBottlenecks = [
  'Writing and content creation taking too long',
  'Information research and synthesis',
  'Decision-making with incomplete information',
  'Preparing presentations and reports',
  'Managing email and communications',
  'Staying current with industry trends',
  'Creative problem-solving and ideation',
  'Time management and prioritization'
];

const PriorityOrderingSection: React.FC<PriorityOrderingSectionProps> = ({
  data,
  onUpdate,
  onComplete,
  isComplete
}) => {
  const [selectedBottlenecks, setSelectedBottlenecks] = useState<string[]>(data.dailyFrictions || []);
  const [customBottleneck, setCustomBottleneck] = useState('');
  const [isDragDisabled, setIsDragDisabled] = useState(false);

  useEffect(() => {
    onUpdate({ dailyFrictions: selectedBottlenecks });
  }, [selectedBottlenecks, onUpdate]);

  const handleToggleBottleneck = (bottleneck: string) => {
    if (selectedBottlenecks.includes(bottleneck)) {
      setSelectedBottlenecks(prev => prev.filter(b => b !== bottleneck));
    } else if (selectedBottlenecks.length < 3) {
      setSelectedBottlenecks(prev => [...prev, bottleneck]);
    }
  };

  const handleAddCustomBottleneck = () => {
    if (customBottleneck.trim() && selectedBottlenecks.length < 3) {
      setSelectedBottlenecks(prev => [...prev, customBottleneck.trim()]);
      setCustomBottleneck('');
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(selectedBottlenecks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSelectedBottlenecks(items);
  };

  const getPriorityLabel = (index: number) => {
    switch (index) {
      case 0: return 'Highest Priority';
      case 1: return 'Medium Priority';
      case 2: return 'Lower Priority';
      default: return '';
    }
  };

  const getPriorityColor = (index: number) => {
    switch (index) {
      case 0: return 'text-red-600 bg-red-50 border-red-200';
      case 1: return 'text-orange-600 bg-orange-50 border-orange-200';
      case 2: return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return '';
    }
  };

  const availableBottlenecks = productivityBottlenecks.filter(b => !selectedBottlenecks.includes(b));

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-6 w-6" />
          Priority Productivity Challenges
        </CardTitle>
        <p className="text-muted-foreground">
          Select your top 3 productivity bottlenecks and rank them by priority
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* Selection Area */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-lg">Available Challenges</h4>
              <Badge variant="outline">
                {selectedBottlenecks.length}/3 selected
              </Badge>
            </div>
            
            <div className="grid gap-3">
              {availableBottlenecks.map((bottleneck) => (
                <div 
                  key={bottleneck}
                  className={`flex items-center gap-3 p-4 border rounded-lg transition-all hover:border-primary/50 ${
                    selectedBottlenecks.length >= 3 ? 'opacity-50' : 'cursor-pointer'
                  }`}
                  onClick={() => selectedBottlenecks.length < 3 && handleToggleBottleneck(bottleneck)}
                >
                  <Checkbox
                    checked={selectedBottlenecks.includes(bottleneck)}
                    disabled={selectedBottlenecks.length >= 3 && !selectedBottlenecks.includes(bottleneck)}
                    onChange={() => handleToggleBottleneck(bottleneck)}
                  />
                  <span className="flex-1">{bottleneck}</span>
                  {selectedBottlenecks.length >= 3 && !selectedBottlenecks.includes(bottleneck) && (
                    <Badge variant="secondary">Max reached</Badge>
                  )}
                </div>
              ))}
            </div>

            {/* Custom bottleneck input */}
            <div className="border-t pt-4">
              <Label className="font-medium mb-2 block">Add Your Own Challenge</Label>
              <div className="flex gap-2">
                <Input
                  value={customBottleneck}
                  onChange={(e) => setCustomBottleneck(e.target.value)}
                  placeholder="Describe your specific productivity challenge..."
                  disabled={selectedBottlenecks.length >= 3}
                  className="flex-1"
                />
                <Button
                  onClick={handleAddCustomBottleneck}
                  disabled={!customBottleneck.trim() || selectedBottlenecks.length >= 3}
                  variant="outline"
                  size="icon"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Priority Ranking Area */}
          {selectedBottlenecks.length > 0 && (
            <div className="space-y-4">
              <div className="border-t pt-6">
                <h4 className="font-semibold text-lg mb-2">Your Priority Ranking</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Drag and drop to rank in order of importance (#1 = highest priority)
                </p>

                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="bottlenecks">
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`space-y-3 p-4 rounded-lg border-2 border-dashed transition-colors ${
                          snapshot.isDraggingOver 
                            ? 'border-primary bg-primary/5' 
                            : 'border-muted'
                        }`}
                      >
                        {selectedBottlenecks.map((bottleneck, index) => (
                          <Draggable 
                            key={bottleneck} 
                            draggableId={bottleneck} 
                            index={index}
                            isDragDisabled={isDragDisabled}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`flex items-center gap-4 p-4 bg-background border rounded-lg shadow-sm transition-all ${
                                  snapshot.isDragging 
                                    ? 'shadow-lg border-primary' 
                                    : 'hover:shadow-md'
                                }`}
                              >
                                <div 
                                  {...provided.dragHandleProps}
                                  className="cursor-grab active:cursor-grabbing"
                                >
                                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                                </div>
                                
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${getPriorityColor(index)}`}>
                                  #{index + 1}
                                </div>
                                
                                <div className="flex-1">
                                  <div className="font-medium">{bottleneck}</div>
                                  <div className={`text-xs font-medium ${getPriorityColor(index).split(' ')[0]}`}>
                                    {getPriorityLabel(index)}
                                  </div>
                                </div>

                                <Button
                                  onClick={() => handleToggleBottleneck(bottleneck)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  Remove
                                </Button>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            </div>
          )}

          {/* Completion Notice */}
          {selectedBottlenecks.length === 3 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800">
                <Target className="h-5 w-5" />
                <span className="font-medium">Priority ranking complete!</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Your top 3 challenges are now ranked by priority. These will be used to create your personalized recommendations.
              </p>
            </div>
          )}

          <Button 
            onClick={onComplete}
            disabled={!isComplete}
            className="w-full mt-6"
            size="lg"
          >
            {selectedBottlenecks.length < 3 
              ? `Select ${3 - selectedBottlenecks.length} more challenge${3 - selectedBottlenecks.length === 1 ? '' : 's'}`
              : 'Complete Assessment'
            }
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PriorityOrderingSection;