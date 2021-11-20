## JDFSTools (jDownloader Filesystem Tools)

Some file and folder managing methods for jDownloader scripting.

Since there are 7 methods in jDownloader to handle copying/moving of files
and folders (copyTo(), copyTo(,,), moveTo(), rename(), renameName(),
renamePath() and renameTo()) and none of them worked as I expected, I wrote
this helper class to make life more easy with files and folders in JD.

### Some benefits:
 - always "fullpath" parameters, no more guessing
 - always same result object instead of bool vs. object
 - auto create paths (missing parent folders)
 - support for recursive operations (can be disabled)
 - support for moving across different mountpoints/drives
 - detailed error message and return code for each error situation
 - control "already exists" handling for files and folders..
       abort       - abort operation (default)
       skip        - skip existing
       rename-dts  - append timestamp to existing
       replace     - replace existing 
       merge       - merge existing (folders only)

### Examples:
1) Move/rename folder "foo" to "bar" on the same drive (will rename)
```
var result = JDFSTools.move("D:\\foo", "D:\\bar");
```

2) Move folder "foo" to "bar" on different drive (will copy+del)
```
var result = JDFSTools.move("C:\\foo", "D:\\bar");
```

3) Copy folder "foo" to "bar" recursively, force replacing of existing files,
   merge folder contents if folders already exist:  
```
var result = JDFSTools.copy("D:\\foo", "D:\\bar", { fileMode: "replace",
                                                    fldrMode: "merge"    });
```

4) Copy folder "foo" to "bar", auto-rename existing files in subfolders  
```
var result = JDFSTools.move("D:\\foo", "D:\\bar", {
                                                    fileMode: "rename-dts",
                                                    fldrMode: "merge" } );
```

5) Copy folder "foo" to folder "bar" (which exists), auto append timestamp  
```
var result = JDFSTools.move("D:\\foo", "D:\\bar", { fldrMode: "rename-dts"});
    // result.success == true
    // result.dstPath == "D:\\bar_1636490640569"
```

6) Copy folder "foo" to "bar" non-recursively, skip existing files.
```
var result = JDFSTools.copy("D:\\foo", "D:\\bar", { recursive: false,
                                                    fileMode: "skip"  });
```


7) Copy not existing folder "noex" to "bar" 
```
var result = JDFSTools.move("D:\\noex", "D:\\bar");
    // result.success == false
    // result.retCode == JDFSTools.RC_ERR_SRC_NOTFOUND
    // result.message == "Error, src [D:\noext] not found."
```

8) ..

