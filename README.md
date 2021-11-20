## JDSFSTools (jDownloader Scripting Filesystem Tools)

Some file and folder managing methods for jDownloader scripting.

Since there are 7 methods in jDownloader to handle copying/moving of files
and folders (copyTo(), copyTo(,,), moveTo(), rename(), renameName(),
renamePath() and renameTo()) and none of them worked as I expected, I wrote
this helper class to make life more easy with files and folders when using JD 
event scripter extension.

### Some benefits:
 - always "fullpath" parameters, no more guessing
 - always same result object instead of bool vs. object
 - auto create paths (missing parent folders)
 - support for recursive operations (can be disabled)
 - support for moving across different mountpoints/drives
 - detailed error message and return code for each error situation
 - control "already exists" handling for files and folders..
   (skip, rename, replace etc.)
   
### Examples:
1) Move/rename folder "foo" to "bar" on the same drive (will rename)
```js
var result = JDSFSTools.move("D:\\foo", "D:\\bar");
```

2) Move folder "foo" to "bar" on different drive (will copy+del)
```js
var result = JDSFSTools.move("C:\\foo", "D:\\bar");
```

3) Copy folder "foo" to "bar" recursively, force replacing of existing files,
   merge folder contents if folders already exist:  
```js
var result = JDSFSTools.copy("D:\\foo", "D:\\bar", { fileMode: "replace",
                                                    fldrMode: "merge"    });
```

4) Copy folder "foo" to "bar", auto-rename existing files in subfolders  
```js
var result = JDSFSTools.move("D:\\foo", "D:\\bar", {
                                                    fileMode: "rename-dts",
                                                    fldrMode: "merge" } );
```

5) Copy folder "foo" to folder "bar" (which exists), auto append timestamp  
```js
var result = JDSFSTools.move("D:\\foo", "D:\\bar", { fldrMode: "rename-dts"});
    // result.success == true
    // result.dstPath == "D:\\bar_1636490640569"
```

6) Copy folder "foo" to "bar" non-recursively, skip existing files.
```js
var result = JDSFSTools.copy("D:\\foo", "D:\\bar", { recursive: false,
                                                    fileMode: "skip"  });
```


7) Copy not existing folder "noex" to "bar" 
```js
var result = JDSFSTools.move("D:\\noex", "D:\\bar");
    // result.success == false
    // result.retCode == JDSFSTools.RC_ERR_SRC_NOTFOUND
    // result.message == "Error, src [D:\noext] not found."
```

8) ..

### Methods
- **copy()**  
  Copy a file or folder.  
  ```js
  var resultObj = JDSFSTools.copy( srcFullPath, dstFullPath [, optionsObj] );
  ```                                   
  - #### Parameters (* = default, [] = optional):  
    | Type   | Parameter name     | Description
    | ------ | ------------------ | ------------------------------------- |
    | String | srcFullPath        | Full path to source file/folder.      | 
    | String | dstFullPath        | Full path to destination file/folder. | 
    | Object | [options]          | Options (see Options table).          | 
    
    - Options (Object):
        | Type   | Member name        | Description
        | ------ | ------------------ | ---------------------------------------- |
        | String | [fileMode]         | (See File/Folder exists modes table.)    |
        | String | [fldrMode]         | (See File/Folder exists modes table.)    |
        | Bool   | [recursive]        | Recursive processing true*, false        |
    
        - File/Folder exists modes:
            | Type   | Name          | Description                    |
            | ------ | -----------   | ------------------------------ |
            | String | abort         | Abort operation (default).     |
            | String | skip          | Skip existing.                 |
            | String | rename-dts    | Append timestamp to existing.  |
            | String | replace       | Replace existing.              |
            | String | merge         | Merge existing (folders only). |
    
  - #### Result Object:
    | Type     | Member name        | Description
    | -------- | ------------------ | ---------------------------------------- |
    | Bool     | success            | Successful or not                        |
    | Long     | retCode            | Return code                              |
    | String   | message            | Friendly (error) message                 |
    | FilePath | srcPath            | Source FilePath                          |
    | FilePath | dstPath            | Destination FilePath                     |
  
- **move()**  
  Move a file or folder.  
  ```js
  var resultObj = JDSFSTools.move( srcFullPath, dstFullPath, optionsObj );
  ```
  Same as copy(), but move (for params and results, look copy() method).
