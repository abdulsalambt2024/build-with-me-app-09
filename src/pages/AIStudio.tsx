import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useGenerateImage, useEnhanceImage, useAIUsage } from '@/hooks/useAIStudio';
import { Wand2, Sparkles, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AIStudio() {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [instruction, setInstruction] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const { toast } = useToast();
  const { data: usage } = useAIUsage();
  const generateImage = useGenerateImage();
  const enhanceImage = useEnhanceImage();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: 'Please enter a prompt', variant: 'destructive' });
      return;
    }

    try {
      const result = await generateImage.mutateAsync({ prompt });
      setGeneratedImage(result);
      toast({ title: 'Image generated successfully!' });
    } catch (error) {
      toast({ title: 'Failed to generate image', variant: 'destructive' });
    }
  };

  const handleEnhance = async () => {
    if (!imageUrl.trim() || !instruction.trim()) {
      toast({ title: 'Please provide both image URL and instruction', variant: 'destructive' });
      return;
    }

    try {
      const result = await enhanceImage.mutateAsync({ imageUrl, instruction });
      setGeneratedImage(result);
      toast({ title: 'Image enhanced successfully!' });
    } catch (error) {
      toast({ title: 'Failed to enhance image', variant: 'destructive' });
    }
  };

  return (
    <div className="container max-w-7xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">AI Studio</h1>
        <p className="text-muted-foreground">
          Create stunning visuals with AI-powered tools
        </p>
      </div>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="generate">
            <Sparkles className="h-4 w-4 mr-2" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="enhance">
            <Wand2 className="h-4 w-4 mr-2" />
            Enhance
          </TabsTrigger>
          <TabsTrigger value="history">
            <ImageIcon className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Image Generator</CardTitle>
                <CardDescription>
                  Describe what you want to create
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="e.g., A beautiful sunset over mountains with vibrant colors"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                />
                <Button
                  onClick={handleGenerate}
                  disabled={generateImage.isPending}
                  className="w-full"
                >
                  {generateImage.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Image
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>Your generated image will appear here</CardDescription>
              </CardHeader>
              <CardContent>
                {generatedImage ? (
                  <img
                    src={generatedImage}
                    alt="Generated"
                    className="w-full rounded-lg"
                  />
                ) : (
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="enhance">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Image Enhancer</CardTitle>
                <CardDescription>
                  Enhance or modify an existing image
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Image URL
                  </label>
                  <Input
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Enhancement Instruction
                  </label>
                  <Textarea
                    placeholder="e.g., Make it more vibrant and add dramatic lighting"
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    rows={4}
                  />
                </div>
                <Button
                  onClick={handleEnhance}
                  disabled={enhanceImage.isPending}
                  className="w-full"
                >
                  {enhanceImage.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enhancing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Enhance Image
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>Enhanced image will appear here</CardDescription>
              </CardHeader>
              <CardContent>
                {generatedImage ? (
                  <img
                    src={generatedImage}
                    alt="Enhanced"
                    className="w-full rounded-lg"
                  />
                ) : (
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Usage History</CardTitle>
              <CardDescription>
                Your AI-generated and enhanced images
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usage && usage.length > 0 ? (
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {usage.map((item) => (
                    <Card key={item.id}>
                      <CardContent className="p-4">
                        {item.result_url && (
                          <img
                            src={item.result_url}
                            alt={item.feature_type}
                            className="w-full rounded-lg mb-2"
                          />
                        )}
                        <p className="text-xs text-muted-foreground capitalize">
                          {item.feature_type.replace('_', ' ')}
                        </p>
                        {item.prompt && (
                          <p className="text-sm mt-1 line-clamp-2">{item.prompt}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-12">
                  No AI usage history yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
