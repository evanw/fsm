#!/usr/bin/python

import os, time, sys

def sources():
    path = './src/'
    return [os.path.join(base, f) for base, folders, files in os.walk(path) for f in files if f.endswith('.js')]

def build():
    path = './www/graph.js'
    try:
        os.remove(path)
        pass
    except Exception as e:
        pass#if there's an exception, it's because file doesn't exist already

    data = '\n'.join(open(file, 'r').read() for file in sources())
    with open(path, 'w') as f:
        f.write(data)
    print ('built %s (%u bytes)' % (path, len(data)))

def stat():
    return [os.stat(file).st_mtime for file in sources()]

def monitor():
    a = stat()
    while True:
        time.sleep(0.5)
        b = stat()
        if a != b:
            a = b
            build()

if __name__ == '__main__':
    build()
    if '--watch' in sys.argv:
        monitor()
