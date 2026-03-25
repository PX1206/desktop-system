package com.desktop.generator.exception;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class MyException extends RuntimeException{

    private static final long serialVersionUID = -2470461654663264392L;

    private Integer errorCode;
    private String message;

    public MyException() {
        super();
    }

    public MyException(String message) {
        super(message);
        this.message = message;
    }

    public MyException(Integer errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
        this.message = message;
    }

    public MyException(ApiCode apiCode) {
        super(apiCode.getMessage());
        this.errorCode = apiCode.getCode();
        this.message = apiCode.getMessage();
    }

    public MyException(String message, Throwable cause) {
        super(message, cause);
    }

    public MyException(Throwable cause) {
        super(cause);
    }

}
