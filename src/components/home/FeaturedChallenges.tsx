import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Code, Clock, Users } from "lucide-react";

const challenges = [
  {
    id: 1,
    title: "Two Sum",
    description: "Find two numbers in an array that add up to a target sum.",
    difficulty: "Easy",
    solvedBy: 1234,
    timeEstimate: "15 min",
    tags: ["Array", "Hash Table"]
  },
  {
    id: 2,
    title: "Binary Tree Traversal",
    description: "Implement in-order traversal of a binary tree.",
    difficulty: "Medium",
    solvedBy: 856,
    timeEstimate: "25 min",
    tags: ["Tree", "Recursion"]
  },
  {
    id: 3,
    title: "Valid Parentheses",
    description: "Check if a string of parentheses is valid and balanced.",
    difficulty: "Easy",
    solvedBy: 2104,
    timeEstimate: "10 min",
    tags: ["Stack", "String"]
  },
  {
    id: 4,
    title: "Merge Sort Implementation",
    description: "Implement the merge sort algorithm efficiently.",
    difficulty: "Medium",
    solvedBy: 592,
    timeEstimate: "30 min",
    tags: ["Sorting", "Divide & Conquer"]
  },
  {
    id: 5,
    title: "Longest Palindrome",
    description: "Find the longest palindromic substring in a string.",
    difficulty: "Hard",
    solvedBy: 321,
    timeEstimate: "45 min",
    tags: ["String", "Dynamic Programming"]
  }
];

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "Easy": return "bg-green-100 text-green-800 border-green-200";
    case "Medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Hard": return "bg-red-100 text-red-800 border-red-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export const FeaturedChallenges = () => {
  return (
    <section className="py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Featured Challenges
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Practice with these popular coding problems and improve your programming skills.
          </p>
        </div>

        <Carousel className="w-full">
          <CarouselContent className="-ml-2 md:-ml-4">
            {challenges.map((challenge) => (
              <CarouselItem key={challenge.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                <Card className="h-full hover:shadow-md transition-shadow border-border">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className={getDifficultyColor(challenge.difficulty)}>
                        {challenge.difficulty}
                      </Badge>
                      <div className="flex items-center text-muted-foreground text-sm">
                        <Clock className="w-4 h-4 mr-1" />
                        {challenge.timeEstimate}
                      </div>
                    </div>
                    <CardTitle className="text-xl text-foreground">{challenge.title}</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {challenge.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center text-muted-foreground text-sm">
                        <Users className="w-4 h-4 mr-1" />
                        {challenge.solvedBy.toLocaleString()} solved
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mb-4">
                      {challenge.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    <Button className="w-full" variant="default">
                      <Code className="w-4 h-4 mr-2" />
                      Solve Now
                    </Button>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex" />
          <CarouselNext className="hidden md:flex" />
        </Carousel>
      </div>
    </section>
  );
};