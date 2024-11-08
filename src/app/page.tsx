"use client";

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Head from 'next/head';
import html2canvas from 'html2canvas';
import { supabase } from '../lib/supabaseClient'; 

export default function Home() {
  const { userId } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!userId) {
      router.push("/auth/sign-in");
    }
  }, [userId, router]);

  const [prompt, setPrompt] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imgDesc, setImgDesc] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(18);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const handleHistoryClick = () => {
    router.push('/comics-history');
  };

  const saveCreditRecord = async () => {
    if (!userId) return;
  
    const today = new Date().toISOString().split('T')[0];
  
    const { error } = await supabase
      .from('comics')
      .insert([{ user_id: userId, created_at: today, prompt }]);
  
    if (error) {
      console.error("Error saving credit record:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (credits === 0) {
      alert('Out of credits');
      return; // Stop further execution
    }

    setLoading(true);
  
    try {
      const response = await fetch('/api/prompt-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });
  
      const data = await response.json();
      if (response.ok) {
        const prompts = data.prompts;
        const descriptions = Object.values(data.img_desc);
  
        const imageResponse = await fetch('/api/image-generator', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompts }),
        });
  
        const imageData = await imageResponse.json();
        if (imageResponse.ok) {
          const { imageUrls } = imageData;
          setImageUrls(imageUrls);
          setImgDesc(descriptions as string[]);
  
          // After generating, save the credit record and update credits
          await saveCreditRecord();
          const newCredits = await calculateCredits();
          setCredits(newCredits);
        } else {
          console.error('Error from image-generator:', imageData.message);
        }
      } else {
        console.error('Error from prompt-generator:', data.message);
      }
    } catch (error) {
      console.error('Error submitting prompt:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    adjustTextareaHeight();
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const saveScreenshotData = async (userId: string | null | undefined, prompt: string, screenshotUrl: string) => {
    if (!userId) {
      console.error("No user ID provided, cannot save data.");
      return;
    }

    const { error } = await supabase
      .from('comics')
      .insert([{ user_id: userId, prompt, screenshot_url: screenshotUrl }]);
    if (error) {
      console.error('Error saving screenshot data:', error);
    }
  };

  const takeScreenshot = async () => {
    if (imageContainerRef.current && userId) {
      const canvas = await html2canvas(imageContainerRef.current, {
        scale: 2,
        useCORS: true,
      });

      const screenshotUrl = canvas.toDataURL("image/png");

      // Save to Supabase
      await saveScreenshotData(userId, prompt, screenshotUrl);
    }
  };

  const calculateCredits = async () => {
    if (!userId) return 18; // Default to 18 if userId is not set

    const today = new Date().toISOString().split('T')[0];

    const { count, error } = await supabase
      .from('comics')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('created_at', today);

    if (error) {
      console.error("Error fetching user records:", error);
      return 18; // Return max credits on error
    }

    if (count === 0) return 18;
    if (count === 1) return 12;
    if (count === 2) return 6;
    return 0;
  };

  useEffect(() => {
    const fetchCredits = async () => {
      const availableCredits = await calculateCredits();
      setCredits(availableCredits);
    };

    fetchCredits();
  }, [userId]); // Run whenever `userId` changes

  useEffect(() => {
    if (imageUrls.length > 0) {
      takeScreenshot();
    }
  }, [imageUrls]);

  useEffect(() => {
    adjustTextareaHeight();
  }, [prompt]);

  const panelStyles = [
    { gridArea: '1 / 1 / 2 / 3', height: '300px' }, // Panel 1 - Large left panel
    { gridArea: '1 / 3 / 2 / 4', height: '300px' }, // Panel 2 - Small right panel
    { gridArea: '2 / 1 / 3 / 2', height: '300px' }, // Panel 3 - Square left panel
    { gridArea: '2 / 2 / 3 / 4', height: '300px' }, // Panel 4 - Large right panel
    { gridArea: '3 / 1 / 4 / 3', height: '300px' }, // Panel 5 - Large bottom left panel
    { gridArea: '3 / 3 / 4 / 4', height: '300px' }  // Panel 6 - Small bottom right panel
  ];

  return (
    <>
      <Head>
        <title>Comic Strip Generator</title>
        <meta name="description" content="Create your own comic strips!" />
        <link href="https://fonts.googleapis.com/css2?family=Bangers&display=swap" rel="stylesheet" />
      </Head>
      <div className="flex min-h-screen bg-cover bg-center" style={{ backgroundImage: "url('/images/bg3.jpg')" }}>
        {/* Sidebar */}
        <div className="fixed h-full w-[5%] p-4 bg-black bg-opacity-50 text-white flex flex-col items-center justify-center">
          <button onClick={handleHistoryClick} className="fixed top-1/2 transform -translate-y-1/2 flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6 5a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>History</span>
          </button>
        </div>

        {/* Left panel */}
        <div className="flex-grow w-[35%] p-4 flex flex-col items-center border-r-4 border-black bg-white bg-opacity-10">
          {imageUrls.length > 0 ? (
            <h1 className="text-3xl font-bold text-white text-center mb-4" style={{ fontFamily: 'Bangers, cursive', textShadow: '2px 2px 0 #000' }}>
              Comic Strip Generator
            </h1>
          ) : null}
          <div className="pt-[40%] w-full flex justify-center mx-auto">
            <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-4 rounded-lg shadow-lg border-4 border-black ml-16">
              <div className="flex flex-col space-y-2">
                <Textarea
                  ref={textareaRef}
                  placeholder="Enter your comic idea here..."
                  value={prompt}
                  onChange={handleTextareaChange}
                  className="w-full min-h-[100px] resize-none border-2 border-black rounded font-sans"
                  rows={3}
                />
                <Button type="submit" className="w-full bg-primary hover:bg-primary-foreground text-white font-bold py-2 px-4 rounded-full border-2 border-black transform transition hover:scale-105">
                  Generate Comic!
                </Button>
                <div className="text-black font" style={{ fontSize: '16px' }}>
                  Credits: {credits}/18
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Right panel with new grid layout */}
        <div className="w-[58%] p-[2%] relative bg-white bg-opacity-10 flex flex-col items-center min-h-screen">
          {imageUrls.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-[22%]">
              <div className="bg-black bg-opacity-40 p-5">
                <h1 className="text-6xl font-bold text-white text-center leading-tight" style={{ fontFamily: 'Bangers, cursive', textShadow: '2px 2px 0 #000' }}>
                  Comic Strip<br />
                  <span className="block">Generator</span>
                </h1>
              </div>
              {loading && <LoadingSpinner />}
            </div>
          ) : (
            <div ref={imageContainerRef} className="w-full h-screen p-2">
              <div className="grid grid-cols-3 gap-2" style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gridTemplateRows: 'auto auto auto',
                gap: '0rem',
                height: '100%'
              }}>
                {imageUrls.map((url, index) => (
                  <div
                    key={index}
                    className="bg-white border border-black shadow-lg overflow-hidden flex flex-col gap-0"
                    style={panelStyles[index]}
                  >
                    <div className="relative flex-grow">
                      <Image
                        src={url}
                        alt={`Panel ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="p-1 bg-white">
                      <p className="text-center text-sm font-medium">
                        {imgDesc[index]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}