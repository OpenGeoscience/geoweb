


class Node():
    ROOT = 0
    BRANCH = 1
    LEAF = 2
    minsize = 0.0001
    nodes = 0
    def __init__(self, parent, rect):
        Node.nodes += 1
        print "new node: %d" % Node.nodes
        self.parent = parent
        self.children = []
        self.points = []
        self.count = 0
        if parent == None:
            self.depth = 0
        else:
            self.depth = parent.depth + 1
            print "depth: %d" % self.depth

        self.rect = rect
        x0,y0,x1,y1 = rect
        if self.parent == None:
            self.type = Node.ROOT
        elif (x1 - x0) <= Node.minsize:
            self.type = Node.LEAF
        else:
            self.type = Node.BRANCH

    def contains(self, x, y):
        x0,y0,x1,y1 = self.rect

        if x >= x0 and x <= x1 and y >= y0 and y <= y1:
            return True
        return False

    def insert(self, point):
        if self.type == Node.LEAF:
            self.count += 1
            #print "leaf: %d" % self.count
            #self.points.append(point)
        else:
            # We have no children so create them
            if not self.children:
                x0,y0,x1,y1 = self.rect
                h = (x1 - x0)/2

                self.children.append(Node(self, (x0, y0, x0 + h, y0 + h)))
                self.children.append(Node(self, (x0, y0 + h, x0 + h, y1)))
                self.children.append(Node(self, (x0 + h, y0 + h, x1, y1)))
                self.children.append(Node(self, (x0 + h, y0, x1, y0 + h)))

            for child in self.children:
                if child.contains(*point):
                    child.insert(point)


class QuadTree():
    leaves = []
    allnodes = []
    def __init__(self, rootnode, minrect):
        Node.minsize = minrect
        self.rootnode = rootnode


    def insert(self, point):
        self.rootnode.insert(point)

def  test():

    rootnode = Node(None, (-66.801667, 43.389167, 46.821667, -59.643333))
    tree = QuadTree(rootnode, 0.01)

    count = 0

    with open('/tmp/points.txt') as fp:
        lines = fp.readlines()
        for line in lines:
            parts = line.split(',')
            tree.insert((float(parts[0]), float(parts[1])))
            count += 1


if __name__ == "__main__":
    test()